import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  // Auth check — same pattern as cron routes
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-vercel-cron");
  const isVercelCron = cronHeader === "1";
  const isManualCall = authHeader === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[score-all] ANTHROPIC_API_KEY is missing");
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Fetch all unscored items
    const { data: unscoredItems, error: fetchError } = await supabaseAdmin
      .from("news_items")
      .select("id, title, summary, url, published_at")
      .eq("viral_score", 0)
      .order("fetched_at", { ascending: false })
      .limit(200); // safety cap

    if (fetchError) {
      console.error("[score-all] Failed to fetch unscored items:", fetchError);
      return NextResponse.json({ error: "Failed to fetch unscored items" }, { status: 500 });
    }

    if (!unscoredItems || unscoredItems.length === 0) {
      return NextResponse.json({ message: "No unscored items found", scored: 0 });
    }

    console.log(`[score-all] Found ${unscoredItems.length} unscored items`);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build batches of 10
    const batches: typeof unscoredItems[] = [];
    for (let i = 0; i < unscoredItems.length; i += 10) {
      batches.push(unscoredItems.slice(i, i + 10));
    }

    console.log(`[score-all] Processing ${batches.length} batch(es)`);

    let totalScored = 0;
    let totalFailed = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      try {
        const articles = batch.map((item) => ({
          title: item.title,
          summary: item.summary || "",
          url: item.url,
          published_at: item.published_at || "",
        }));

        console.log(`[score-all] Batch ${batchIdx + 1}/${batches.length}: sending ${articles.length} items to Claude`);

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: VIRAL_SCORING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildScoringUserPrompt(articles) }],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        console.log(`[score-all] Batch ${batchIdx + 1} raw response:`, rawText.substring(0, 300));

        const cleaned = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = JSON.parse(cleaned);
          scores = Array.isArray(parsed) ? parsed : [parsed];
          console.log(`[score-all] Batch ${batchIdx + 1}: parsed ${scores.length} scores`);
        } catch (parseErr) {
          console.error(`[score-all] Batch ${batchIdx + 1} invalid JSON:`, rawText);
          console.error(`[score-all] Parse error:`, parseErr);
          totalFailed += batch.length;
          continue;
        }

        for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
          const score = scores[j];
          if (typeof score?.score !== "number") {
            console.warn(`[score-all] Score at index ${j} is not a number:`, score);
            totalFailed++;
            continue;
          }

          const { error: updateErr } = await supabaseAdmin
            .from("news_items")
            .update({
              viral_score: Math.min(100, Math.max(0, score.score)),
              viral_reason: score.reason || "",
              ...(score.category ? { category: score.category } : {}),
            })
            .eq("id", batch[j].id);

          if (updateErr) {
            console.error(`[score-all] Failed to update item ${batch[j].id}:`, updateErr);
            totalFailed++;
          } else {
            totalScored++;
          }
        }
      } catch (err) {
        console.error(`[score-all] Batch ${batchIdx + 1} error:`, err);
        totalFailed += batch.length;
      }
    }

    console.log(`[score-all] Done. Scored: ${totalScored}, Failed: ${totalFailed}`);

    return NextResponse.json({
      message: "Score-all complete",
      total: unscoredItems.length,
      scored: totalScored,
      failed: totalFailed,
    });
  } catch (err) {
    console.error("[score-all] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
