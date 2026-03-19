import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_CHANNELS = ["grafikcem", "maskulenkod", "linkedin"];

// GET /api/style/profile?channel=grafikcem
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel") || "grafikcem";
  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("channel_settings")
    .select("style_profile")
    .eq("channel_id", channel)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data?.style_profile || null });
}

// POST /api/style/profile
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { channel, profile } = body as {
    channel: string;
    profile: {
      sample_tweets: string;
      tone: string;
      sentence_length: number;
      emoji_usage: string;
      signature_closer: string;
      avoid_words: string[];
    };
  };

  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const sampleCount = profile.sample_tweets
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;

  const styleProfile = {
    ...profile,
    sample_count: sampleCount,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("channel_settings")
    .update({ style_profile: styleProfile, updated_at: new Date().toISOString() })
    .eq("channel_id", channel);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: styleProfile });
}
