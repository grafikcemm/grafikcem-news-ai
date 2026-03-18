import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Turkish X audience peak hours as fallback
const FALLBACK_HOURS: Record<number, number> = {
  0: 10, 1: 5, 2: 3, 3: 2, 4: 2, 5: 5,
  6: 15, 7: 30, 8: 65, 9: 75, 10: 70, 11: 60,
  12: 75, 13: 70, 14: 55, 15: 50, 16: 45, 17: 50,
  18: 55, 19: 65, 20: 80, 21: 85, 22: 70, 23: 40,
};

export async function GET() {
  try {
    // Try to get actual data from published tweets
    const { data: published } = await supabaseAdmin
      .from("tweet_drafts")
      .select("created_at, ai_score")
      .eq("status", "approved")
      .limit(200);

    if (!published || published.length < 10) {
      // Not enough data — use fallback
      return NextResponse.json({
        hours: FALLBACK_HOURS,
        is_estimated: true,
        best_hours: [9, 12, 20, 21],
        message: "Yeterli veri yok — Türk X kitlesi genel saatleri kullanıldı",
      });
    }

    // Aggregate by hour
    const hourCounts: Record<number, { count: number; total_score: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourCounts[h] = { count: 0, total_score: 0 };
    }

    for (const draft of published) {
      const hour = new Date(draft.created_at).getHours();
      hourCounts[hour].count += 1;
      hourCounts[hour].total_score += draft.ai_score || 50;
    }

    // Normalize to 0-100
    const maxCount = Math.max(...Object.values(hourCounts).map((v) => v.count), 1);
    const hours: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hours[h] = Math.round((hourCounts[h].count / maxCount) * 100);
    }

    const bestHours = Object.entries(hours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([h]) => parseInt(h));

    return NextResponse.json({
      hours,
      is_estimated: false,
      best_hours: bestHours,
      message: `${published.length} paylaşım analiz edildi`,
    });
  } catch (err) {
    console.error("Optimal times error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
