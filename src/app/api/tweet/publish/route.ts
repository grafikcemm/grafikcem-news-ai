import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TwitterApi } from "twitter-api-v2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draft_id } = body as { draft_id: string };

    if (!draft_id) {
      return NextResponse.json({ error: "draft_id required" }, { status: 400 });
    }

    // Fetch draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("tweet_drafts")
      .select("*")
      .eq("id", draft_id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.status === "published") {
      return NextResponse.json({ error: "Draft already published" }, { status: 400 });
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    let tweetId: string;

    try {
      if (draft.tweet_type === "thread" && draft.thread_tweets && Array.isArray(draft.thread_tweets)) {
        // Post thread
        const tweets = draft.thread_tweets as string[];
        if (tweets.length === 0) {
          return NextResponse.json({ error: "Thread has no tweets" }, { status: 400 });
        }

        // Post first tweet
        const firstTweet = await twitterClient.v2.tweet(tweets[0]);
        tweetId = firstTweet.data.id;

        // Reply chain
        let lastTweetId = tweetId;
        for (let i = 1; i < tweets.length; i++) {
          const reply = await twitterClient.v2.reply(tweets[i], lastTweetId);
          lastTweetId = reply.data.id;
        }
      } else {
        // Post single tweet
        const tweet = await twitterClient.v2.tweet(draft.content);
        tweetId = tweet.data.id;
      }
    } catch (err) {
      console.error("Twitter API error:", err);
      // Do NOT mark as published on failure
      return NextResponse.json(
        { error: "Failed to publish to X. Please check your API credentials." },
        { status: 500 }
      );
    }

    // Update draft status
    await supabaseAdmin
      .from("tweet_drafts")
      .update({ status: "published" })
      .eq("id", draft_id);

    // Create published tweet record
    const { data: published, error: pubError } = await supabaseAdmin
      .from("published_tweets")
      .insert({
        draft_id: draft_id,
        x_post_id: tweetId,
      })
      .select()
      .single();

    if (pubError) {
      console.error("Published tweet record error:", pubError);
    }

    return NextResponse.json({
      message: "Published successfully",
      tweet_id: tweetId,
      published,
    });
  } catch (err) {
    console.error("Tweet publish error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
