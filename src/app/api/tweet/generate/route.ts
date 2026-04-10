import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TWEET_GENERATION_SYSTEM, TWEET_GENERATION_USER, FORMAT_INSTRUCTIONS } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

import { parseClaudeJSON } from "@/lib/parse-claude";
export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { news_id, format, abMode, tone, language } = body as { news_id: string; format?: string; abMode?: boolean; tone?: string; language?: string };

    if (!news_id) {
      return NextResponse.json({ error: "news_id required" }, { status: 400 });
    }

    const { data: newsItem, error } = await supabaseAdmin
      .from("news_items")
      .select("*, sources(name)")
      .eq("id", news_id)
      .maybeSingle();

    if (error || !newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }

    const sourceName = (newsItem.sources as { name: string } | null)?.name || "Unknown";

    const { data: styleSettings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "style_profile")
      .maybeSingle();

    const styleSection = styleSettings?.value
      ? `\n\nSTYLE PROFILE — write exactly in this style:\n${JSON.stringify(styleSettings.value)}`
      : "";

    const { data: voiceSettings } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_voice_prompt")
      .maybeSingle();

    const voiceSection = voiceSettings?.value ? `\n\nEK KURALLAR:\n${voiceSettings.value}` : "";
    const systemPrompt = `${TWEET_GENERATION_SYSTEM}${styleSection}${voiceSection}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const title = newsItem.title_tr || newsItem.title;
    const summary = newsItem.summary || "";
    const baseUserPrompt = TWEET_GENERATION_USER(title, summary, sourceName, newsItem.category || "ai_news");
    
    let formatInstruction = format && FORMAT_INSTRUCTIONS[format as keyof typeof FORMAT_INSTRUCTIONS]
      ? `\n\nFORMAT ZORUNLU:\n${FORMAT_INSTRUCTIONS[format as keyof typeof FORMAT_INSTRUCTIONS]}`
      : "";
      
    if (abMode) {
      formatInstruction += `\n\nA/B TEST MODU AKTİF: Lütfen birbirinden tamamen farklı açılara sahip en az 2 farklı varyasyon üret.`;
    }
    if (tone) {
      formatInstruction += `\n\nİSTENEN TON/TARZ: ${tone}`;
    }
    if (language && language !== "tr") {
      if (language === "en") formatInstruction += `\n\nİSTENEN DİL: Yalnızca İngilizce (English) üret.`;
      if (language === "bilingual") formatInstruction += `\n\nİSTENEN DİL: İki dilli (Bilingual) - bir kısmını Türkçe bir kısmını İngilizce veya ayrı ayrı iki versiyon üret.`;
    }
    
    const userPrompt = baseUserPrompt + formatInstruction;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const response = await anthropicRes.json();
    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed: {
      options: Array<{
        type: string;
        content: string;
        thread_tweets: string[] | null;
        score: number;
        score_reason: string;
        pattern_used?: string;
      }>;
    };
    try {
      parsed = parseClaudeJSON<any>(text);
    } catch {
      console.error("Claude returned invalid JSON:", rawText);
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }

    if (!parsed.options || !Array.isArray(parsed.options)) {
      return NextResponse.json({ error: "AI returned unexpected format" }, { status: 500 });
    }

    const drafts = [];
    for (const option of parsed.options) {
      const { data: draft, error: draftError } = await supabaseAdmin
        .from("tweet_drafts")
        .insert({
          news_id: newsItem.id,
          content: option.content,
          tweet_type: option.type === "thread" ? "thread" : "single",
          thread_tweets: option.thread_tweets || null,
          ai_score: Math.min(100, Math.max(0, option.score || 0)),
          status: "pending",
          is_recommended: false,
        })
        .select()
        .single();

      if (!draftError && draft) {
        drafts.push({
          ...draft,
          score_reason: option.score_reason,
          pattern_used: option.pattern_used || null,
        });
      }
    }

    return NextResponse.json({ options: drafts });
  } catch (err) {
    console.error("Tweet generate error:", err);
    const msg = err instanceof Error ? err.message : "";
    const isCreditError = msg.includes("credit balance");
    return NextResponse.json(
      { error: isCreditError ? "API kredi yetersiz — Anthropic Console'dan kredi yükleyin" : "Internal server error" },
      { status: 500 }
    );
  }
}
