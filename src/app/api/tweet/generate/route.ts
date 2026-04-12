import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TWEET_GENERATION_SYSTEM, TWEET_GENERATION_USER, FORMAT_INSTRUCTIONS } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

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

    const text = await generateWithGemini(userPrompt, 'creative', systemPrompt);
    console.log("DEBUG: Gemini raw text:", text);

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
    
    const jsonParsed = parseAIJSON<any>(text);
    if (!jsonParsed) {
      console.error("Gemini returned invalid JSON:", text);
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }
    parsed = jsonParsed;

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

      if (draft && !draftError) {
        drafts.push({
          ...draft,
          score_reason: option.score_reason,
          pattern_used: option.pattern_used || null,
        });
      } else {
        console.error("Tweet draft insert error:", draftError);
      }
    }

    if (drafts.length === 0 && parsed.options.length > 0) {
        console.error("All draft inserts failed. Returning raw AI options as fallback.");
        return NextResponse.json({ 
          options: parsed.options.map((opt, idx) => ({
            id: `temp-${idx}`,
            content: opt.content,
            tweet_type: opt.type,
            thread_tweets: opt.thread_tweets,
            ai_score: opt.score,
            score_reason: opt.score_reason,
            pattern_used: opt.pattern_used,
            status: 'pending'
          })),
          warning: "İçerikler üretildi ancak veritabanına kaydedilemedi."
        });
    }

    return NextResponse.json({ options: drafts });
  } catch (err: any) {
    console.error("Tweet generate error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err.message || "") },
      { status: 500 }
    );
  }
}
