import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";

const parser = new Parser();

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // Insert new items
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("news_items")
      .insert(newItems)
      .select("id, title, summary, url, published_at");

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to insert news items" }, { status: 500 });
    }

    // Batch score with Claude (max 10 per call)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const batches = [];
    for (let i = 0; i < inserted.length; i += 10) {
      batches.push(inserted.slice(i, i + 10));
    }

    for (const batch of batches) {
      try {
        const articles = batch.map((item) => ({
          title: item.title,
          summary: item.summary || "",
          url: item.url,
          published_at: item.published_at || "",
        }));

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: VIRAL_SCORING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildScoringUserPrompt(articles) }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";

        // Try to parse as array of scores
        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = JSON.parse(text);
          scores = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          console.error("Claude returned invalid JSON for scoring:", text);
          continue;
        }

        // Update each item
        for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
          const score = scores[j];
          if (typeof score?.score === "number") {
            await supabaseAdmin
              .from("news_items")
              .update({
                viral_score: Math.min(100, Math.max(0, score.score)),
                viral_reason: score.reason || "",
                category: score.category || batch[j].url,
              })
              .eq("id", batch[j].id);
          }
        }
      } catch (err) {
        console.error("Claude scoring error:", err);
        // Skip this batch, continue
      }
    }

    return NextResponse.json({
      message: "Fetch complete",
      newItems: inserted.length,
      scored: inserted.length,
    });
  } catch (err) {
    console.error("Cron fetch-news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
