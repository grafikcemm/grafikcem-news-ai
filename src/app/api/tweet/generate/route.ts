import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { TWEET_GENERATION_SYSTEM_PROMPT, buildTweetUserPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { news_id } = body as { news_id: string };

    if (!news_id) {
      return NextResponse.json({ error: "news_id required" }, { status: 400 });
    }

    // Fetch news item with source
    const { data: newsItem, error } = await supabaseAdmin
      .from("news_items")
      .select("*, sources(name)")
      .eq("id", news_id)
      .single();

    if (error || !newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }

    const sourceName = (newsItem.sources as { name: string } | null)?.name || "Unknown";

    // Check for custom voice prompt
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_voice_prompt")
      .single();

    const systemPrompt = settings?.value
      ? `${TWEET_GENERATION_SYSTEM_PROMPT}\n\nEK KURALLAR:\n${settings.value}`
      : TWEET_GENERATION_SYSTEM_PROMPT;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: { options: Array<{ type: string; content: string; thread_tweets: string[] | null; score: number; score_reason: string }> };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Claude returned invalid JSON:", text);
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }

    if (!parsed.options || !Array.isArray(parsed.options)) {
      return NextResponse.json({ error: "AI returned unexpected format" }, { status: 500 });
    }

    // Save all 3 as pending drafts
    const drafts = [];
    for (const option of parsed.options) {
      const { data: draft, error: draftError } = await supabaseAdmin
        .from("tweet_drafts")
        .insert({
          news_id: newsItem.id,
          content: option.content,
          tweet_type: option.type === "thread" ? "thread" : "single",
          thread_tweets: option.thread_tweets || null,
          ai_score: Math.min(100, Math.max(0, option.score || 0)),
          status: "pending",
          is_recommended: false,
        })
        .select()
        .single();

      if (!draftError && draft) {
        drafts.push({ ...draft, score_reason: option.score_reason });
      }
    }

    return NextResponse.json({ options: drafts });
  } catch (err) {
    console.error("Tweet generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
