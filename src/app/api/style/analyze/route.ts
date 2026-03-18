import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { STYLE_ANALYSIS_SYSTEM, STYLE_ANALYSIS_USER } from "@/lib/prompts";
import { TwitterApi } from "twitter-api-v2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh } = body as { refresh?: boolean };

    // Check cached profile unless refresh requested
    if (!refresh) {
      const { data: existing } = await supabaseAdmin
        .from("settings")
        .select("value, updated_at")
        .eq("key", "style_profile")
        .single();

      if (existing?.value) {
        return NextResponse.json({ profile: existing.value, cached: true });
      }
    }

    // Fetch tweets from X API
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      return NextResponse.json({ error: "Twitter Bearer Token not configured" }, { status: 500 });
    }

    const client = new TwitterApi(bearerToken);

    // Look up @grafikcem user ID
    let userId: string;
    try {
      const user = await client.v2.userByUsername("grafikcem");
      if (!user.data?.id) {
        return NextResponse.json({ error: "Could not find @grafikcem account" }, { status: 404 });
      }
      userId = user.data.id;
    } catch (err) {
      console.error("Twitter user lookup error:", err);
      return NextResponse.json(
        { error: "X API rate limited. 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    // Fetch last 200 tweets
    let tweetTexts: string[] = [];
    try {
      const timeline = await client.v2.userTimeline(userId, {
        max_results: 100,
        "tweet.fields": ["text", "public_metrics"],
        exclude: ["retweets", "replies"],
      });

      const tweets = timeline.data?.data || [];
      tweetTexts = tweets.map((t) => t.text).filter((t) => t.length > 20);

      // Fetch second page if available
      if (timeline.data?.meta?.next_token && tweetTexts.length < 200) {
        const page2 = await client.v2.userTimeline(userId, {
          max_results: 100,
          "tweet.fields": ["text"],
          exclude: ["retweets", "replies"],
          pagination_token: timeline.data.meta.next_token,
        });
        const moreTweets = page2.data?.data || [];
        tweetTexts = [...tweetTexts, ...moreTweets.map((t) => t.text).filter((t) => t.length > 20)];
      }
    } catch (err) {
      console.error("Twitter timeline error:", err);
      return NextResponse.json(
        { error: "X API rate limited. 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    if (tweetTexts.length === 0) {
      return NextResponse.json({ error: "No tweets found to analyze" }, { status: 404 });
    }

    // Analyze with Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: STYLE_ANALYSIS_SYSTEM,
      messages: [
        {
          role: "user",
          content: STYLE_ANALYSIS_USER(tweetTexts.slice(0, 100)),
        },
      ],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let profile: Record<string, unknown>;
    try {
      profile = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    // Save to settings table
    await supabaseAdmin.from("settings").upsert(
      { key: "style_profile", value: profile },
      { onConflict: "key" }
    );

    // Also save to style_analyses table
    await supabaseAdmin.from("style_analyses").insert({
      account_handle: "grafikcem",
      profile_json: profile,
      tweets_analyzed: tweetTexts.length,
    });

    return NextResponse.json({ profile, cached: false, tweets_analyzed: tweetTexts.length });
  } catch (err) {
    console.error("Style analyze error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value, updated_at")
    .eq("key", "style_profile")
    .single();

  if (!data?.value) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile: data.value, updated_at: data.updated_at });
}
