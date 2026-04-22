import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { TweetAccount, TweetFormat } from "@/lib/tweet-engine";

interface DraftBody {
  channel: TweetAccount;
  content: string;
  format: TweetFormat | "thread";
  status?: string;
  metadata?: Record<string, unknown>;
}

function normalizeMetadata(metadata: DraftBody["metadata"]) {
  return metadata && typeof metadata === "object" ? metadata : {};
}

export async function GET(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  let query = supabaseAdmin
    .from("tweet_drafts")
    .select("id, channel, content, format, status, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = (await request.json()) as DraftBody;

    if (!body.channel || !body.content?.trim()) {
      return NextResponse.json({ error: "channel and content required" }, { status: 400 });
    }

    const insertPayload = {
      channel: body.channel,
      content: body.content,
      format: body.format,
      status: body.status ?? "pending",
      metadata: normalizeMetadata(body.metadata),
    };

    const { data, error } = await supabaseAdmin
      .from("tweet_drafts")
      .insert(insertPayload)
      .select("id, channel, content, format, status, metadata, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (err) {
    console.error("[tweet/drafts] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const updates: Record<string, unknown> = {};

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (typeof body.content === "string") {
      updates.content = body.content;
    }

    if (typeof body.status === "string") {
      updates.status = body.status;
    }

    if (body.metadata && typeof body.metadata === "object") {
      updates.metadata = body.metadata;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "no updates provided" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("tweet_drafts")
      .update(updates)
      .eq("id", id)
      .select("id, channel, content, format, status, metadata, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (err) {
    console.error("[tweet/drafts] patch error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
