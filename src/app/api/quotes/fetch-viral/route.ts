import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TwitterApi } from "twitter-api-v2";

export async function POST() {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      return NextResponse.json({ error: "Twitter Bearer Token not configured" }, { status: 500 });
    }

    const client = new TwitterApi(bearerToken);

    const queries = [
      { q: "AI lang:tr -is:retweet min_faves:500", lang: "tr" },
      { q: "yapay zeka -is:retweet min_faves:500", lang: "tr" },
      { q: "(Claude OR ChatGPT OR Cursor) -is:retweet min_faves:300", lang: "any" },
      { q: "(design OR figma) lang:en -is:retweet min_faves:1000", lang: "en" },
    ];

    const allTweets: Array<{
      x_tweet_id: string;
      content: string;
      author_handle: string;
      author_name: string;
      likes: number;
      retweets: number;
    }> = [];

    for (const query of queries) {
      try {
        const result = await client.v2.search(query.q, {
          max_results: 10,
          "tweet.fields": ["public_metrics", "author_id", "created_at"],
          "user.fields": ["username", "name"],
          expansions: ["author_id"],
        });

        const tweets = result.data?.data || [];
        const users = result.data?.includes?.users || [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        for (const tweet of tweets) {
          const author = userMap.get(tweet.author_id || "");
          allTweets.push({
            x_tweet_id: tweet.id,
            content: tweet.text,
            author_handle: author?.username || "unknown",
            author_name: author?.name || "Unknown",
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
          });
        }
      } catch (err) {
        console.error("Search error for query:", query.q, err);
        // Continue with other queries
      }
    }

    if (allTweets.length === 0) {
      return NextResponse.json(
        { error: "X API rate limited veya tweet bulunamadı. 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    // Upsert to DB (ignore duplicates)
    const { error } = await supabaseAdmin
      .from("viral_tweets")
      .upsert(allTweets, { onConflict: "x_tweet_id", ignoreDuplicates: true });

    if (error) {
      console.error("DB upsert error:", error);
    }

    // Return fresh list sorted by likes
    const { data: viralTweets } = await supabaseAdmin
      .from("viral_tweets")
      .select("*")
      .order("likes", { ascending: false })
      .limit(30);

    return NextResponse.json({ tweets: viralTweets || [], fetched: allTweets.length });
  } catch (err) {
    console.error("Fetch viral error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from("viral_tweets")
    .select("*")
    .order("likes", { ascending: false })
    .limit(30);

  return NextResponse.json({ tweets: data || [] });
}
