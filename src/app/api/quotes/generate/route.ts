import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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
    
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: QUOTE_GENERATION_SYSTEM,
        messages: [{ role: "user", content: QUOTE_GENERATION_USER(tweet.content) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const response = await anthropicRes.json();
    const quoteText = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    return NextResponse.json({ quote: quoteText, original: tweet });
  } catch (err) {
    console.error("Quote generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
