import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { TweetAccount } from "@/lib/tweet-engine";

export async function GET(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");

  if (!account) {
    return NextResponse.json({ error: "account required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("viral_references")
    .select("id, account, tweet_text, engagement_score, format, is_active, created_at")
    .eq("account", account)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ references: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const account = body.account as TweetAccount;
    const tweetText = typeof body.tweetText === "string" ? body.tweetText.trim() : "";
    const format = typeof body.format === "string" ? body.format : null;

    if (!account || !tweetText) {
      return NextResponse.json({ error: "account and tweetText required" }, { status: 400 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("viral_references")
      .select("id", { count: "exact", head: true })
      .eq("account", account)
      .eq("is_active", true);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: "Bu hesap için maksimum 10 referans var." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("viral_references")
      .insert({
        account,
        tweet_text: tweetText,
        format,
      })
      .select("id, account, tweet_text, engagement_score, format, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reference: data });
  } catch (err) {
    console.error("[tweet/references] post error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("viral_references")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
