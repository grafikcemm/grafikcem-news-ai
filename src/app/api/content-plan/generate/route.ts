import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseClaudeJSON } from "@/lib/parse-claude";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API anahtarı ayarlanmamış (ANTHROPIC_API_KEY)" }, { status: 500 });
    }

    // Verileri Topla
    const { data: newsItems } = await supabaseAdmin.from("news_items")
      .select("title, summary, viral_score")
      .gte("viral_score", 60)
      .order("viral_score", { ascending: false })
      .limit(10);
      
    const { data: competitors } = await supabaseAdmin.from("competitors")
      .select("handle, category")
      .limit(10);
    
    console.log("Plan üretimi için veriler toplandı:", { newsCount: newsItems?.length, competitorsCount: competitors?.length });

    const systemPrompt = "Sen profesyonel bir sosyal medya stratejistisin. Verilen gündem ve rakip verilerine dayanarak haftalık içerik planı oluşturursun.";
    const userPrompt = `Aşağıdaki verilere dayanarak Türk tasarım, AI ve kişisel gelişim içerik üreticisi için (Ali Cem) bu haftanın 10 içerik planını oluştur. 
Haftada en az 2 içerik şu kanallar için olmalı: @grafikcem, @maskulenkod, LinkedIn.

Gündem Verileri: ${JSON.stringify(newsItems || [])}
Rakip Listesi: ${JSON.stringify(competitors || [])}

Lütfen SADECE şu JSON yapısını döndür (başka metin ekleme):
{
  "week_theme": "Haftanın ana teması",
  "ai_insights": "Haftalık stratejik öneri ve analiz",
  "contents": [
    {
      "day": "Pazartesi",
      "platform": "@grafikcem | @maskulenkod | LinkedIn",
      "format": "Reel | Carousel | Post | Thread",
      "title": "İçerik Başlığı",
      "hook": "Merak uyandırıcı kanca cümlesi",
      "why": "Neden bu içerik üretilmeli?",
      "best_time": "19:00"
    }
  ]
}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2500,
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
    const parsed = parseClaudeJSON<any>(rawText, "ContentPlan");

    if (!parsed || !parsed.contents) {
      console.error("AI geçersiz JSON döndürdü:", rawText);
      return NextResponse.json({ error: "AI geçersiz format döndürdü. Lütfen tekrar deneyin." }, { status: 500 });
    }

    // Save to Database
    const weekStart = new Array(1).fill(0).map(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    })[0];

    const { data: upserted, error: dbError } = await supabaseAdmin
      .from("weekly_content_plans")
      .upsert({
        week_start: weekStart,
        theme: parsed.week_theme,
        content_json: parsed.contents,
        ai_insights: parsed.ai_insights
      }, { onConflict: 'week_start' })
      .select()
      .single();

    if (dbError) {
      console.error("Plan veritabanına kaydedilemedi:", dbError);
      return NextResponse.json({ ...parsed, warning: "Veritabanına kaydedilemedi: " + dbError.message });
    }

    return NextResponse.json(upserted);
  } catch (err: any) {
    console.error("Content Plan generate error:", err);
    return NextResponse.json({ error: "Plan oluşturulamadı: " + (err.message || "Bilinmeyen hata") }, { status: 500 });
  }
}
