import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

const MOCK_VIRAL_TWEETS = [
  { id: "1", x_tweet_id: "1", content: "Claude Code ayda 200 dolara mal oluyor. Goose aynı şeyi ücretsiz yapıyor. Freelancerlar için oyun değişti.", author_handle: "techuser1", author_name: "Tech User", likes: 1200, retweets: 340 },
  { id: "2", x_tweet_id: "2", content: "Figma + Claude MCP entegrasyonu artık gerçek. Tasarımcıların iş akışı tamamen değişiyor. Hazır mısınız?", author_handle: "designertr", author_name: "Designer TR", likes: 890, retweets: 210 },
  { id: "3", x_tweet_id: "3", content: "n8n ile kurduğum otomasyon sistemim bu ay 15 saatimi kurtardı. Detaylar için yanıtlayın.", author_handle: "automationtr", author_name: "Otomasyon TR", likes: 650, retweets: 180 },
];

// POST — returns cached tweets from DB or mock fallback (Twitter API removed)
export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const { data: cached } = await supabaseAdmin
      .from("viral_tweets")
      .select("*")
      .order("likes", { ascending: false })
      .limit(30);

    if (cached && cached.length > 0) {
      return NextResponse.json({ tweets: cached, fetched: cached.length, cached: true });
    }

    // No cached tweets — save mock data to DB first
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("viral_tweets")
      .insert(MOCK_VIRAL_TWEETS.map(({ id, ...rest }) => rest)) // exclude mock numeric id
      .select();

    if (insertError) {
      console.error("Insert mock error:", insertError);
      return NextResponse.json({ tweets: MOCK_VIRAL_TWEETS, fetched: MOCK_VIRAL_TWEETS.length, mock: true });
    }

    return NextResponse.json({ tweets: inserted, fetched: inserted.length, mock: false });
  } catch (err) {
    console.error("Fetch viral error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — returns cached tweets from DB
export async function GET(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { data } = await supabaseAdmin
    .from("viral_tweets")
    .select("*")
    .order("likes", { ascending: false })
    .limit(30);

  return NextResponse.json({ tweets: data || [] });
}
