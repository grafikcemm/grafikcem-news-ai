import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { TWEET_GENERATION_SYSTEM, TWEET_GENERATION_USER, FORMAT_INSTRUCTIONS } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { news_id, format } = body as { news_id: string; format?: string };

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

    // Load style profile if available
    const { data: styleSettings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "style_profile")
      .single();

    const styleSection = styleSettings?.value
      ? `\n\nSTYLE PROFILE — write exactly in this style:\n${JSON.stringify(styleSettings.value)}`
      : "";

    // Check for custom voice prompt
    const { data: voiceSettings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_voice_prompt")
      .single();

    const voiceSection = voiceSettings?.value ? `\n\nEK KURALLAR:\n${voiceSettings.value}` : "";

    const systemPrompt = `${TWEET_GENERATION_SYSTEM}${styleSection}${voiceSection}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const title = newsItem.title_tr || newsItem.title;
    const summary = newsItem.summary || "";

    // Build user prompt — inject format instruction if a specific format was chosen
    const baseUserPrompt = TWEET_GENERATION_USER(title, summary, sourceName, newsItem.category || "ai_news");
    const formatInstruction = format && FORMAT_INSTRUCTIONS[format]
      ? `\n\nFORMAT ZORUNLU:\n${FORMAT_INSTRUCTIONS[format]}`
      : "";
    const userPrompt = baseUserPrompt + formatInstruction;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6-20260218",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed: {
      options: Array<{
        type: string;
        content: string;
        thread_tweets: string[] | null;
        score: number;
        score_reason: string;
        pattern_used?: string;
      }>;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Claude returned invalid JSON:", rawText);
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }

    if (!parsed.options || !Array.isArray(parsed.options)) {
      return NextResponse.json({ error: "AI returned unexpected format" }, { status: 500 });
    }

    // Save drafts
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
        drafts.push({
          ...draft,
          score_reason: option.score_reason,
          pattern_used: option.pattern_used || null,
        });
      }
    }

    return NextResponse.json({ options: drafts });
  } catch (err) {
    console.error("Tweet generate error:", err);
    const msg = err instanceof Error ? err.message : "";
    const isCreditError = msg.includes("credit balance");
    return NextResponse.json(
      { error: isCreditError ? "API kredi yetersiz — Anthropic Console'dan kredi yükleyin" : "Internal server error" },
      { status: 500 }
    );
  }
}
