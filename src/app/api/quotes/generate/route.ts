import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { QUOTE_GENERATION_SYSTEM, QUOTE_GENERATION_USER } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: QUOTE_GENERATION_SYSTEM,
      messages: [{ role: "user", content: QUOTE_GENERATION_USER(tweet.content) }],
    });

    const quoteText = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    return NextResponse.json({ quote: quoteText, original: tweet });
  } catch (err) {
    console.error("Quote generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
