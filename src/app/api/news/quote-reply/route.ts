import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_QUOTE_REPLY_SYSTEM, NEWS_QUOTE_REPLY_USER } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { parseAIJSON } from "@/lib/parse-ai";
import { generateWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { news_id, format } = body as { news_id: string; format: string };

    if (!news_id || !format) {
      return NextResponse.json({ error: "news_id and format required" }, { status: 400 });
    }

    const { data: newsItem } = await supabaseAdmin
      .from("news_items")
      .select("*")
      .eq("id", news_id)
      .maybeSingle();

    if (!newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }
    
    const userPrompt = NEWS_QUOTE_REPLY_USER(newsItem.title_tr || newsItem.title, newsItem.summary || "", format);

    const text = await generateWithGemini(userPrompt, 'creative', NEWS_QUOTE_REPLY_SYSTEM);

    let parsed: { content: string; hook_strength: string | number; reason: string };
    try {
      parsed = parseAIJSON<any>(text);
    } catch {
      console.error("Failed to parse AI JSON for Quote & Reply", text.slice(0, 300));
      return NextResponse.json({ error: "AI returned invalid response format" }, { status: 500 });
    }

    return NextResponse.json({ 
      content: parsed.content, 
      hook_strength: parsed.hook_strength, 
      reason: parsed.reason,
      original: newsItem 
    });
  } catch (err: any) {
    console.error("Quote & Reply generate error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
