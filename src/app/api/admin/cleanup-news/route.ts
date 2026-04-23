import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Delete news older than 7 days
    const { error: oldError } = await supabaseAdmin
      .from("news_items")
      .delete()
      .lt("fetched_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oldError) throw oldError;

    // 2. Delete news with viral_score < 70 (from the last 7 days)
    const { error: lowScoreError } = await supabaseAdmin
      .from("news_items")
      .delete()
      .lt("viral_score", 70);

    if (lowScoreError) throw lowScoreError;

    return NextResponse.json({ success: true, message: "News cleanup completed" });
  } catch (err: any) {
    console.error("[cleanup-news] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
