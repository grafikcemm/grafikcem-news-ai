import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { REPLY_GENERATION_SYSTEM, REPLY_GENERATION_USER } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";

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
      .maybeSingle();

    if (!tweet) {
      return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
    }

    const replyText = await generateWithGemini(REPLY_GENERATION_USER(tweet.content), 'creative', REPLY_GENERATION_SYSTEM);

    return NextResponse.json({ reply: replyText.trim(), original: tweet });
  } catch (err: any) {
    console.error("Reply generate error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
