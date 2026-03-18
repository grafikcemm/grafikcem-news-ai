import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt, AUTO_TRANSLATE_SYSTEM_PROMPT, buildAutoTranslateUserPrompt } from "@/lib/prompts";

export const maxDuration = 60; // Max allowed for Vercel Hobby tier

const parser = new Parser();

export async function POST(request: NextRequest) {
  // Check API key at startup
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is missing");
  }

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-vercel-cron");

    const isVercelCron = cronHeader === "1";
    const isManualCall = authHeader === process.env.CRON_SECRET;

    if (!isVercelCron && !isManualCall) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch active sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("is_active", true);

    if (sourcesError || !sources) {
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    const newItems: Array<{
      source_id: string;
      title: string;
      summary: string;
      url: string;
      category: string;
      published_at: string | null;
    }> = [];

    // Parse each RSS feed
    const feedPromises = sources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.rss_url);
        const items = feed.items.slice(0, 20); // Max 20 per source

        for (const item of items) {
          if (!item.link || !item.title) continue;

          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("news_items")
            .select("id")
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
            });
          }
        }
      } catch (err) {
        console.error(`RSS fetch failed for ${source.name}:`, err);
        // Skip this source, continue others
      }
    });

    await Promise.all(feedPromises);

    if (newItems.length === 0) {
      return NextResponse.json({ message: "No new items found", count: 0 });
    }

    // Insert or ignore new items based on their url
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("news_items")
      .upsert(newItems, { onConflict: 'url', ignoreDuplicates: true })
      .select("id, title, summary, url, published_at");

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to insert news items" }, { status: 500 });
    }

    console.log(`[fetch-news] Inserted ${inserted.length} new items`);

    // Batch score with Claude (max 10 per call)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const batches = [];
    for (let i = 0; i < inserted.length; i += 10) {
      batches.push(inserted.slice(i, i + 10));
    }

    console.log(`[fetch-news] Scoring ${inserted.length} items in ${batches.length} batch(es)`);

    for (const batch of batches) {
      try {
        const articles = batch.map((item) => ({
          title: item.title,
          summary: item.summary || "",
          url: item.url,
          published_at: item.published_at || "",
        }));

        console.log(`[fetch-news] Sending batch of ${articles.length} to Claude for scoring`);

        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          system: VIRAL_SCORING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildScoringUserPrompt(articles) }],
        });

        const rawScoreText = response.content[0].type === "text" ? response.content[0].text : "";
        console.log(`[fetch-news] Claude raw scoring response:`, rawScoreText.substring(0, 500));

        const scoreText = rawScoreText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        // Try to parse as array of scores
        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = JSON.parse(scoreText);
          scores = Array.isArray(parsed) ? parsed : [parsed];
          console.log(`[fetch-news] Parsed ${scores.length} scores from Claude`);
        } catch (parseErr) {
          console.error("[fetch-news] Claude returned invalid JSON for scoring. Raw text:", rawScoreText);
          console.error("[fetch-news] JSON parse error:", parseErr);
          continue;
        }

        // Update each item
        for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
          const score = scores[j];
          if (typeof score?.score === "number") {
            const { error: updateErr } = await supabaseAdmin
              .from("news_items")
              .update({
                viral_score: Math.min(100, Math.max(0, score.score)),
                viral_reason: score.reason || "",
                category: score.category || batch[j].url,
              })
              .eq("id", batch[j].id);
            if (updateErr) {
              console.error(`[fetch-news] Failed to update score for item ${batch[j].id}:`, updateErr);
            }
          } else {
            console.warn(`[fetch-news] Score at index ${j} is not a number:`, score);
          }
        }
      } catch (err) {
        console.error("[fetch-news] Claude scoring batch error:", err);
        // Skip this batch, continue
      }
    }

    // Auto-translate non-Turkish titles
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    const nonTurkishItems = inserted.filter(
      (item) => !turkishChars.test(item.title)
    );

    if (nonTurkishItems.length > 0) {
      const translateBatches = [];
      for (let i = 0; i < nonTurkishItems.length; i += 10) {
        translateBatches.push(nonTurkishItems.slice(i, i + 10));
      }

      for (const batch of translateBatches) {
        try {
          const articles = batch.map((item) => ({
            title: item.title,
            summary: item.summary || "",
          }));

          const translateResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            system: AUTO_TRANSLATE_SYSTEM_PROMPT,
            messages: [
              { role: "user", content: buildAutoTranslateUserPrompt(articles) },
            ],
          });

          const rawTranslateText =
            translateResponse.content[0].type === "text"
              ? translateResponse.content[0].text
              : "";
          const translateText = rawTranslateText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

          let translations: Array<{ title_tr: string; summary_tr: string }>;
          try {
            const parsed = JSON.parse(translateText);
            translations = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            console.error("Claude returned invalid JSON for translation:", rawTranslateText);
            continue;
          }

          for (let j = 0; j < Math.min(translations.length, batch.length); j++) {
            const translation = translations[j];
            if (translation?.title_tr) {
              await supabaseAdmin
                .from("news_items")
                .update({
                  title_tr: translation.title_tr,
                  title_original: batch[j].title,
                  summary: translation.summary_tr || batch[j].summary,
                })
                .eq("id", batch[j].id);
            }
          }
        } catch (err) {
          console.error("Claude translation error:", err);
        }
      }
    }

    return NextResponse.json({
      message: "Fetch complete",
      newItems: inserted.length,
      scored: inserted.length,
      translated: nonTurkishItems.length,
    });
  } catch (err) {
    console.error("Cron fetch-news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
