import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_QUOTE_REPLY_SYSTEM, NEWS_QUOTE_REPLY_USER } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

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
      .single();

    if (!newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    
    const userPrompt = NEWS_QUOTE_REPLY_USER(newsItem.title_tr || newsItem.title, newsItem.summary || "", format);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: NEWS_QUOTE_REPLY_SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const response = await anthropicRes.json();
    const rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    let parsed: { content: string; hook_strength: string | number; reason: string };
    try {
      // The parseClaudeJSON second argument 'quote_reply' is used in the original code
      parsed = parseClaudeJSON<any>(rawText);
    } catch {
      console.error("Failed to parse Claude JSON for Quote & Reply", rawText);
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
