import { NextRequest, NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(req: NextRequest) {
  try {
    const { competitors, existingSeries, weekNumber } = await req.json();

    const prompt = `@grafikcem Instagram (tasarım/AI/freelance) için 5 carousel fikri öner. Rakipler: ${competitors?.join(', ') || 'Yok'}. Mevcutlar: ${existingSeries || 'Yok'}. Hook ve viral nedeni dahil et. JSON: {"strategy_note":"","plans":[{"series_name":"","topic":"","why_viral":"","parts":7,"hook":"","inspiration":"","differentiation":"","content_type":"","estimated_engagement":""}]}`;

    const text = await generateWithGemini(prompt, 'planning', undefined, 'gemini-2.0-flash-lite');
    const parsed = parseAIJSON(text);

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI JSON" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: parsed });
  } catch (error: any) {
    console.error("Carousel Planning error:", error);
    return NextResponse.json({ error: error.message || "Plan oluşturulurken hata oluştu" }, { status: 500 });
  }
}
