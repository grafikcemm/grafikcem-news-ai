import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Parser from "rss-parser";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt, AUTO_TRANSLATE_SYSTEM_PROMPT, buildAutoTranslateUserPrompt } from "@/lib/prompts";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is missing");
    return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });
  }

  try {
    // 1. Fetch active sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("is_active", true);

    if (sourcesError || !sources) {
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    // 2. Allow processing a single source for debugging/Hobby split
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
        const feed = await parser.parseURL(source.rss_url);
        const items = feed.items.slice(0, 20); // Max 20 per source

        for (const item of items) {
          if (!item.link || !item.title) continue;

          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("news_items")
            .select("id, custom_tag")
            .eq("url", item.link)
            .single();

          const lowerTitle = item.title.toLowerCase();
          const lowerSummary = (item.contentSnippet || item.content?.substring(0, 500) || "").toLowerCase();
          const fullText = `${lowerTitle} ${lowerSummary}`;
          
          let custom_tag = null;
          const ecoKeywords = ["türkiye", "türk", "istanbul", "ankara", "girişim", "startup tr", "webrazzi", "teknoloji şirketi"];
          const toolKeywords = ["figma", "canva", "midjourney", "claude", "chatgpt", "gpt", "gemini", "update", "launch", "v2", "v3", "v4", "new feature", "yeni özellik", "güncelleme"];
          
          if (ecoKeywords.some(k => fullText.includes(k))) custom_tag = "turkish_eco";
          else if (toolKeywords.some(k => fullText.includes(k))) custom_tag = "tool_update";

          if (!existing) {
            newItems.push({
              source_id: source.id,
              title: item.title,
              summary: item.contentSnippet || item.content?.substring(0, 500) || "",
              url: item.link,
              category: source.category,
              published_at: item.pubDate || item.isoDate || null,
              custom_tag
            });
          } else if (custom_tag && existing.custom_tag !== custom_tag) {
             await supabaseAdmin.from("news_items").update({ custom_tag }).eq("id", existing.id);
          }
        }
      } catch (err) {
        console.error(`RSS fetch failed for ${source.name}:`, err);
      }
    });

    await Promise.all(feedPromises);

    if (newItems.length === 0) {
      return NextResponse.json({ message: "No new items found", count: 0 });
    }

    // 4. Cap at 3 items per run for Hobby 10s timeout
    const itemsToProcess = newItems.slice(0, 3);
    console.log(`[fetch-news] Processing ${itemsToProcess.length} items`);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("news_items")
      .upsert(itemsToProcess, { onConflict: 'url', ignoreDuplicates: true })
      .select("id, title, summary, url, published_at");

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to insert news items" }, { status: 500 });
    }

    // 5. Batch score with Claude
    const scoringBatches = [];
    for (let i = 0; i < inserted.length; i += 10) {
      scoringBatches.push(inserted.slice(i, i + 10));
    }

    for (const batch of scoringBatches) {
      try {
        const userPrompt = buildScoringUserPrompt(batch);

        const scoringRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1500,
            system: VIRAL_SCORING_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (scoringRes.ok) {
          const scoringData = await scoringRes.json();
          const rawScoreText = scoringData.content[0].type === "text" ? scoringData.content[0].text : "";
          const scoreText = rawScoreText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

          let scores: Array<{ score: number; reason: string; category?: string }>;
          try {
            const parsed = parseClaudeJSON<any>(scoreText);
            scores = Array.isArray(parsed) ? parsed : (parsed.scores || [parsed]);
          } catch {
            console.error("[fetch-news] Invalid score JSON:", scoreText);
            continue;
          }

          for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
            const s = scores[j];
            if (typeof s?.score === "number") {
              await supabaseAdmin
                .from("news_items")
                .update({
                  viral_score: Math.min(100, Math.max(0, s.score)),
                  viral_reason: s.reason || "",
                  category: s.category || batch[j].url,
                })
                .eq("id", batch[j].id);
            }
          }
        }
      } catch (err) {
        console.error("[fetch-news] Scoring batch error:", err);
      }
    }

    // 6. Auto-translate non-Turkish titles
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    const itemsToTranslate = inserted.filter(item => !turkishChars.test(item.title));

    if (itemsToTranslate.length > 0) {
      try {
        const translateUserPrompt = buildAutoTranslateUserPrompt(itemsToTranslate);
        const translateRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1500,
            system: AUTO_TRANSLATE_SYSTEM_PROMPT,
            messages: [{ role: "user", content: translateUserPrompt }],
          }),
        });

        if (translateRes.ok) {
          const translateData = await translateRes.json();
          const rawTranslateText = translateData.content[0].type === "text" ? translateData.content[0].text : "";
          const translateText = rawTranslateText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

          let translations: Array<{ title_tr: string; summary_tr: string }>;
          try {
            const parsed = parseClaudeJSON<any>(translateText);
            translations = Array.isArray(parsed) ? parsed : (parsed.translations || [parsed]);
          } catch {
            console.error("[fetch-news] Invalid translation JSON:", translateText);
            translations = [];
          }

          for (let j = 0; j < Math.min(translations.length, itemsToTranslate.length); j++) {
            const tr = translations[j];
            if (tr?.title_tr) {
              await supabaseAdmin
                .from("news_items")
                .update({
                  title_tr: tr.title_tr,
                  title_original: itemsToTranslate[j].title,
                  summary: tr.summary_tr || itemsToTranslate[j].summary,
                })
                .eq("id", itemsToTranslate[j].id);
            }
          }
        }
      } catch (err) {
        console.error("[fetch-news] Translation error:", err);
      }
    }

    return NextResponse.json({
      message: "Fetch complete",
      processed: itemsToProcess.length,
      inserted: inserted.length,
      translated: itemsToTranslate.length,
    });
  } catch (err) {
    console.error("Cron fetch-news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
