import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

const MAX_NEWS_IDS = 30;

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { news_ids } = body as { news_ids: string[] };

    if (!news_ids || !Array.isArray(news_ids) || news_ids.length === 0) {
      return NextResponse.json({ error: "news_ids array required" }, { status: 400 });
    }

    const limitedIds = news_ids.slice(0, MAX_NEWS_IDS);

    // Fetch news items
    const { data: items, error } = await supabaseAdmin
      .from("news_items")
      .select("id, title, summary, url, published_at")
      .in("id", limitedIds);

    if (error || !items || items.length === 0) {
      return NextResponse.json({ error: "No matching news items found" }, { status: 404 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Batch score (max 10 per call)
    const batches = [];
    for (let i = 0; i < items.length; i += 10) {
      batches.push(items.slice(i, i + 10));
    }

    let scored = 0;

    for (const batch of batches) {
      try {
        const articles = batch.map((item) => ({
          title: item.title,
          summary: item.summary || "",
          url: item.url,
          published_at: item.published_at || "",
        }));

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: VIRAL_SCORING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildScoringUserPrompt(articles) }],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = JSON.parse(text);
          scores = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          console.error("Claude returned invalid JSON for scoring:", rawText);
          continue;
        }

        for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
          const score = scores[j];
          if (typeof score?.score === "number") {
            await supabaseAdmin
              .from("news_items")
              .update({
                viral_score: Math.min(100, Math.max(0, score.score)),
                viral_reason: score.reason || "",
                ...(score.category ? { category: score.category } : {}),
              })
              .eq("id", batch[j].id);
            scored++;
          }
        }
      } catch (err) {
        console.error("Claude scoring batch error:", err);
        continue;
      }
    }

    return NextResponse.json({
      message: "Scoring complete",
      scored,
      requested: news_ids.length,
      processed: limitedIds.length,
    });
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
