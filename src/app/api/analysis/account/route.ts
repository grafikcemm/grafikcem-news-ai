import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ACCOUNT_ANALYSIS_SYSTEM, ACCOUNT_ANALYSIS_USER } from "@/lib/prompts";
import { TwitterApi } from "twitter-api-v2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body as { username: string };

    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      return NextResponse.json({ error: "Twitter Bearer Token not configured" }, { status: 500 });
    }

    const client = new TwitterApi(bearerToken);

    // Look up user
    let userId: string;
    try {
      const user = await client.v2.userByUsername(username.replace("@", ""));
      if (!user.data?.id) {
        return NextResponse.json({ error: `@${username} hesabı bulunamadı` }, { status: 404 });
      }
      userId = user.data.id;
    } catch {
      return NextResponse.json(
        { error: "X API rate limited. 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    // Fetch last 100 tweets
    let tweetTexts: string[] = [];
    try {
      const timeline = await client.v2.userTimeline(userId, {
        max_results: 100,
        "tweet.fields": ["text", "public_metrics", "created_at"],
        exclude: ["retweets"],
      });

      const tweets = timeline.data?.data || [];
      tweetTexts = tweets.map((t) => {
        const metrics = t.public_metrics;
        return `[Likes: ${metrics?.like_count || 0}, RT: ${metrics?.retweet_count || 0}] ${t.text}`;
      });
    } catch {
      return NextResponse.json(
        { error: "X API rate limited. 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    if (tweetTexts.length === 0) {
      return NextResponse.json({ error: "Bu hesapta tweet bulunamadı" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: ACCOUNT_ANALYSIS_SYSTEM,
      messages: [
        {
          role: "user",
          content: ACCOUNT_ANALYSIS_USER(tweetTexts, username.replace("@", "")),
        },
      ],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    return NextResponse.json({ analysis, username, tweets_analyzed: tweetTexts.length });
  } catch (err) {
    console.error("Account analysis error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
