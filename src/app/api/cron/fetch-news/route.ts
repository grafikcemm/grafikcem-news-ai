import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Parser from "rss-parser";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";
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

    // 2. Allow processing a single source for debugging
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

    // 3. Parse each RSS feed
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

        const items = feed.items.slice(0, 20); // Max 20 per source
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
            const lowerTitle = item.title.toLowerCase();
            const lowerSummary = (item.contentSnippet || item.content?.substring(0, 500) || "").toLowerCase();
            const fullText = `${lowerTitle} ${lowerSummary}`;
            
            let custom_tag = null;
            const ecoKeywords = ["türkiye", "türk", "istanbul", "ankara", "girişim", "startup tr", "webrazzi", "teknoloji şirketi"];
            const toolKeywords = ["figma", "canva", "midjourney", "claude", "chatgpt", "gpt", "gemini", "update", "launch", "v2", "v3", "v4", "new feature", "yeni özellik", "güncelleme"];
            
            if (ecoKeywords.some(k => fullText.includes(k))) custom_tag = "turkish_eco";
            else if (toolKeywords.some(k => fullText.includes(k))) custom_tag = "tool_update";

            newItems.push({
              source_id: source.id,
              title: item.title,
              summary: item.contentSnippet || item.content?.substring(0, 500) || "",
              url: item.link,
              category: source.category,
              published_at: item.pubDate || item.isoDate || null,
              custom_tag
            });
            addedCount++;
          }
        }
        console.log(`✓ ${source.name}: ${addedCount} haber`);
      } catch (err: any) {
        console.error(`✗ ${source.name}: Unexpected error - ${err.message || String(err)}`);
      }
    });

    await Promise.all(feedPromises);

    if (newItems.length === 0) {
      return NextResponse.json({ message: "No new items found", count: 0 });
    }

    // 4. Cap at 3 items per run for Hobby 10s timeout
    const itemsToProcess = newItems.slice(0, 3);
    console.log(`[fetch-news] Processing ${itemsToProcess.length} items`);

    // Insert new items
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("news_items")
      .upsert(itemsToProcess, { onConflict: 'url', ignoreDuplicates: true })
      .select("id, title, summary, url, published_at, category");

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to insert news items" }, { status: 500 });
    }

    // 5. Scoring & Translation Loop
    for (const item of inserted) {
      try {
        // Translation Step
        const translationPrompt = `
Aşağıdaki haber başlığını ve özetini Türkçeye çevir.
Başlık: net, anlaşılır, Türkçe gazete diline uygun.
Özet: 2-3 cümle, sade Türkçe, bilgilendirici.

Orijinal başlık: ${item.title}
Orijinal özet: ${item.summary || item.title}

SADECE JSON formatında yanıt ver, başka hiçbir şey yazma:
{"title_tr": "Türkçe başlık buraya", "summary_tr": "Türkçe özet buraya"}
`;

        const translationText = await generateWithGemini(translationPrompt, 'analytical');
        const translation = parseAIJSON<{title_tr: string, summary_tr: string}>(translationText);

        // Scoring Step
        const scoringPrompt = buildScoringUserPrompt([item]);
        const scoreResultText = await generateWithGemini(scoringPrompt, 'analytical', VIRAL_SCORING_SYSTEM_PROMPT);
        const scoreData = parseAIJSON<any>(scoreResultText);
        
        const score = Array.isArray(scoreData) ? scoreData[0] : (scoreData?.scores?.[0] || scoreData);

        // Update with both translation and score
        await supabaseAdmin
          .from("news_items")
          .update({
            title_tr: translation?.title_tr || null,
            summary_tr: translation?.summary_tr || null,
            title_original: item.title,
            viral_score: score?.score || 0,
            viral_reason: score?.reason || "",
            category: score?.category || item.category,
          })
          .eq("id", item.id);

      } catch (err) {
        console.error(`[fetch-news] Processing error for ${item.title}:`, err);
      }
    }

    return NextResponse.json({
      message: "Fetch complete",
      processed: itemsToProcess.length,
      inserted: inserted.length,
    });
  } catch (err) {
    console.error("Cron fetch-news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
