import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { REPLY_GENERATION_SYSTEM, REPLY_GENERATION_USER } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { viral_tweet_id } = body as { viral_tweet_id: string };

    if (!viral_tweet_id) {
      return NextResponse.json({ error: "viral_tweet_id required" }, { status: 400 });
    }

    const { data: tweet } = await supabaseAdmin
      .from("viral_tweets")
      .select("*")
      .eq("id", viral_tweet_id)
      .single();

    if (!tweet) {
      return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
    }

    // Load style profile
    const { data: styleSettings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "style_profile")
      .single();

    const styleProfile = styleSettings?.value
      ? JSON.stringify(styleSettings.value)
      : undefined;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6-20260218",
      max_tokens: 512,
      system: REPLY_GENERATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: REPLY_GENERATION_USER(tweet.content),
        },
      ],
    });

    const replyText = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    return NextResponse.json({ reply: replyText, original: tweet });
  } catch (err) {
    console.error("Reply generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
