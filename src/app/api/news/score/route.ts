import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { VIRAL_SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

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
    const { data: items, error: fetchError } = await supabaseAdmin
      .from("news_items")
      .select("id, title, summary, url, published_at")
      .in("id", limitedIds);

    if (fetchError || !items || items.length === 0) {
      return NextResponse.json({ error: "No matching news items found" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    // Batch score (max 10 per call)
    const batches = [];
    for (let i = 0; i < items.length; i += 10) {
      batches.push(items.slice(i, i + 10));
    }

    let scoredCount = 0;

    for (const batch of batches) {
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
          console.error("Claude API Error Status:", anthropicRes.status, errorText);
          continue;
        }

        const response = await anthropicRes.json();
        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let scores: Array<{ score: number; reason: string; category?: string }>;
        try {
          const parsed = parseClaudeJSON<any>(text);
          // If parsed is a single object { "scores": [...] }, extract it
          scores = Array.isArray(parsed) ? parsed : (parsed.scores || [parsed]);
        } catch {
          console.error("Claude returned invalid JSON for scoring:", rawText);
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
                ...(s.category ? { category: s.category } : {}),
              })
              .eq("id", batch[j].id);
            scoredCount++;
          }
        }
      } catch (err) {
        console.error("Claude scoring batch error:", err);
        continue;
      }
    }

    return NextResponse.json({
      message: "Scoring complete",
      scored: scoredCount,
      requested: news_ids.length,
      processed: limitedIds.length,
    });
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
