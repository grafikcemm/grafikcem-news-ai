import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

export const maxDuration = 60; // Max for Vercel Hobby

export async function POST(request: NextRequest) {
  if (!validateCronRequest(request)) return unauthorizedResponse();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[score-all] ANTHROPIC_API_KEY is missing");
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Fetch unscored items
    const { data: unscoredItems, error: fetchError } = await supabaseAdmin
      .from("news_items")
      .select("id, title, summary, url, published_at")
      .eq("viral_score", 0)
      .order("fetched_at", { ascending: false })
      .limit(30);

    if (fetchError) {
      console.error("[score-all] Failed to fetch unscored items:", fetchError);
      return NextResponse.json({ error: "Failed to fetch unscored items" }, { status: 500 });
    }

    if (!unscoredItems || unscoredItems.length === 0) {
      return NextResponse.json({ message: "No unscored items found", scored: 0 });
    }

    // Build batches of 10
    const batches = [];
    for (let i = 0; i < unscoredItems.length; i += 10) {
      batches.push(unscoredItems.slice(i, i + 10));
    }

    let totalScored = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      try {
        const userPrompt = buildScoringUserPrompt(batch);

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 2048,
            system: VIRAL_SCORING_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!anthropicRes.ok) {
          const errorText = await anthropicRes.text();
          console.error(`[score-all] Batch ${batchIdx + 1} Claude Error:`, errorText);
          throw new Error(`Claude API Error: ${anthropicRes.status}`);
        }

        const response = await anthropicRes.json();
        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const cleaned = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = parseClaudeJSON<any>(cleaned);
          scores = Array.isArray(parsed) ? parsed : (parsed.scores || [parsed]);
        } catch (parseErr) {
          console.error(`[score-all] Batch ${batchIdx + 1} invalid JSON:`, rawText);
          totalFailed += batch.length;
          continue;
        }

        for (let j = 0; j < Math.min(scores.length, batch.length); j++) {
          const s = scores[j];
          if (typeof s?.score !== "number") {
            totalFailed++;
            continue;
          }

          const { error: updateErr } = await supabaseAdmin
            .from("news_items")
            .update({
              viral_score: Math.min(100, Math.max(0, s.score)),
              viral_reason: s.reason || "",
              ...(s.category ? { category: s.category } : {}),
            })
            .eq("id", batch[j].id);

          if (updateErr) {
            totalFailed++;
          } else {
            totalScored++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[score-all] Batch ${batchIdx + 1} error:`, err);
        errors.push(`Batch ${batchIdx + 1}: ${msg}`);
        totalFailed += batch.length;
      }
    }

    return NextResponse.json({
      message: "Score-all complete",
      total: unscoredItems.length,
      scored: totalScored,
      failed: totalFailed,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    console.error("[score-all] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
