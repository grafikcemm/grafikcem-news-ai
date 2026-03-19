import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

const MAX_CONTENT_LENGTH = 5000;

// GET /api/channels/[channelId]/content?status=draft
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { channelId } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("generated_content")
    .select("*, news_items(title, url)")
    .eq("channel", channelId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "rejected");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content: data || [] });
}

// PATCH /api/channels/[channelId]/content — update status or content text
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { channelId } = await params;
  const body = await request.json();
  const { id, status, content } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (content !== undefined && content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: "Content too long (max 5000 chars)" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status = status;
    if (status === "used") updates.used_at = new Date().toISOString();
  }
  if (content !== undefined) updates.content = content;

  const { data, error } = await supabaseAdmin
    .from("generated_content")
    .update(updates)
    .eq("id", id)
    .eq("channel", channelId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content: data });
}
