import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Parser from "rss-parser";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGeminiFast } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export const maxDuration = 60; // Max allowed for Vercel Hobby tier

const parser = new Parser({
  timeout: 8000,
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  if (!validateCronRequest(request)) return unauthorizedResponse();

  try {
    // 1. Fetch active sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("is_active", true);

    if (sourcesError || !sources) {
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    // 2. Daily limit check
    const DAILY_LIMIT = 5;
    const today = new Date().toISOString().split('T')[0];
    
    const { count: todayCount, error: countError } = await supabaseAdmin
      .from("news_items")
      .select("*", { count: "exact", head: true })
      .gte("fetched_at", today + "T00:00:00Z");

    if (countError) throw countError;
    
    if (todayCount !== null && todayCount >= DAILY_LIMIT) {
      return NextResponse.json({ message: "Günlük limit doldu", count: todayCount });
    }

    const remainingSlots = DAILY_LIMIT - (todayCount || 0);

    // 3. Allow processing a single source for debugging
    const sourceParam = request.nextUrl.searchParams.get("source");
    let sourcesToProcess = sources;
    if (sourceParam !== null) {
      const idx = parseInt(sourceParam, 10);
      if (!isNaN(idx) && idx >= 0 && idx < sources.length) {
        sourcesToProcess = [sources[idx]];
      }
    }

    const newItems: Array<{
      source_id: string;
      title: string;
      summary: string;
      url: string;
      category: string;
      published_at: string | null;
      custom_tag: string | null;
    }> = [];

    // 4. Parse each RSS feed
    const feedPromises = sourcesToProcess.map(async (source) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        let xmlData;
        try {
          const res = await fetch(source.rss_url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          xmlData = await res.text();
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          console.error(`✗ ${source.name}: ${fetchErr.message || 'Fetch failed'}`);
          return;
        }

        let feed;
        try {
          feed = await parser.parseString(xmlData);
        } catch (parseErr: any) {
          console.error(`✗ ${source.name}: XML Parse failed - ${parseErr.message || 'Parse error'}`);
          return;
        }

        const items = feed.items.slice(0, 10); // Check first 10
        let addedCount = 0;

        for (const item of items) {
          if (!item.link || !item.title) continue;

          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("news_items")
            .select("id, custom_tag")
            .eq("url", item.link)
            .single();

          if (!existing) {
            newItems.push({
              source_id: source.id,
              title: item.title,
              summary: item.contentSnippet || item.content?.substring(0, 500) || "",
              url: item.link,
              category: source.category,
              published_at: item.pubDate || item.isoDate || null,
              custom_tag: null
            });
            addedCount++;
          }
        }
      } catch (err: any) {
        console.error(`✗ ${source.name}: Unexpected error - ${err.message || String(err)}`);
      }
    });

    await Promise.all(feedPromises);

    if (newItems.length === 0) {
      return NextResponse.json({ message: "No new items found", count: 0 });
    }

    // 5. Process only what we need to hit the limit
    const itemsToProcess = newItems.slice(0, remainingSlots * 2); // Process double to account for filtering
    
    const validItemsToInsert = [];

    // 6. Scoring, Filter & Translation Loop
    for (const item of itemsToProcess) {
      if (validItemsToInsert.length >= remainingSlots) break;

      try {
        // Viral Filter Step
        const filterPrompt = `Haber puanla (0-100). Odak: AI/tasarım/freelance. Başlık: ${item.title}. JSON: {"s":0-100}`;
        const filterResultText = await generateWithGeminiFast(filterPrompt);
        const filterData = parseAIJSON<{s: number}>(filterResultText);

        if (!filterData || filterData.s < 75) {
                      continue;
        }

        const translationPrompt = `TR'ye çevir. JSON: {"t":"","s":""}. Metin: ${item.title} | ${item.summary?.slice(0, 100)}`;
        const translationText = await generateWithGeminiFast(translationPrompt);
        const translation = parseAIJSON<{t: string, s: string}>(translationText);

        validItemsToInsert.push({
           ...item,
           title_tr: translation?.t || null,
           summary_tr: translation?.s || null,
           title_original: item.title,
           viral_score: filterData.s || 0,
           viral_reason: null,
           category: item.category
        });

      } catch (err) {
        console.warn(`[fetch-news] Gemini scoring failed for item, using fallback: ${item.title}`);
        validItemsToInsert.push({
           ...item,
           title_tr: null,
           summary_tr: null,
           title_original: item.title,
           viral_score: 50,
           viral_reason: null,
           category: 'uncategorized'
        });
      }
    }

    if (validItemsToInsert.length === 0) {
      return NextResponse.json({ message: "No valid items after filter", count: 0 });
    }

    // Insert only worth fetching items
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("news_items")
      .upsert(validItemsToInsert, { onConflict: 'url', ignoreDuplicates: true })
      .select("id, title, summary, url, published_at, category");

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to insert news items" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Fetch and filter complete",
      processed: itemsToProcess.length,
      inserted: inserted?.length || 0,
    });
  } catch (err) {
    console.error("Cron fetch-news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
