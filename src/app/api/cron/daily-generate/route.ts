import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { TWEET_GENERATION_SYSTEM_PROMPT, buildTweetUserPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-vercel-cron");

    const isVercelCron = cronHeader === "1";
    const isManualCall = authHeader === process.env.CRON_SECRET;

    if (!isVercelCron && !isManualCall) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get top 3 news items from last 48h
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: topNews, error: newsError } = await supabaseAdmin
      .from("news_items")
      .select("*, sources(name)")
      .eq("is_used", false)
      .gte("fetched_at", fortyEightHoursAgo)
      .order("viral_score", { ascending: false })
      .limit(3);

    if (newsError || !topNews || topNews.length === 0) {
      return NextResponse.json({ message: "No eligible news items found" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Check for custom voice prompt
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_voice_prompt")
      .single();

    const systemPrompt = settings?.value
      ? `${TWEET_GENERATION_SYSTEM_PROMPT}\n\nEK KURALLAR:\n${settings.value}`
      : TWEET_GENERATION_SYSTEM_PROMPT;

    const results = [];

    for (let i = 0; i < topNews.length; i++) {
      const newsItem = topNews[i];
      const sourceName = (newsItem.sources as { name: string } | null)?.name || "Unknown";

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: buildTweetUserPrompt({
                title: newsItem.title,
                summary: newsItem.summary || "",
                source_name: sourceName,
                category: newsItem.category || "ai_news",
              }),
            },
          ],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let parsed: { options: Array<{ type: string; content: string; thread_tweets: string[] | null; score: number; score_reason: string }> };
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error("Claude returned invalid JSON for tweet generation:", rawText);
          continue;
        }

        if (!parsed.options || !Array.isArray(parsed.options)) continue;

        // Save drafts
        const isTopItem = i === 0; // First item is recommended
        for (const option of parsed.options) {
          const { error: draftError } = await supabaseAdmin.from("tweet_drafts").insert({
            news_id: newsItem.id,
            content: option.content,
            tweet_type: option.type === "thread" ? "thread" : "single",
            thread_tweets: option.thread_tweets || null,
            ai_score: Math.min(100, Math.max(0, option.score || 0)),
            status: "pending",
            is_recommended: isTopItem,
          });

          if (draftError) {
            console.error("Draft insert error:", draftError);
          }
        }

        // Mark news as used
        await supabaseAdmin
          .from("news_items")
          .update({ is_used: true })
          .eq("id", newsItem.id);

        results.push({ news_id: newsItem.id, title: newsItem.title, drafts: parsed.options.length });
      } catch (err) {
        console.error(`Tweet generation failed for ${newsItem.title}:`, err);
        continue;
      }
    }

    return NextResponse.json({
      message: "Daily generate complete",
      results,
    });
  } catch (err) {
    console.error("Cron daily-generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
