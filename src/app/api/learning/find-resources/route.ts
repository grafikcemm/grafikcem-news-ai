import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getISOWeek, getYear } from "date-fns";
import { parseClaudeJSON } from "@/lib/parse-claude";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    
    const systemPrompt = "Sen bir tasarım ve AI alanında uzman kaynak küratörüsün.";
    const userPrompt = `Ali Cem Bozma, İstanbul'da freelance grafik tasarımcı. Uzmanlıkları: logo tasarımı, sosyal medya yönetimi, AI görsel üretimi, web tasarımı. Bu hafta için şu kategorilerde 8 kaynak öner: Tasarım (2 kaynak), AI (2 kaynak), Freelance (2 kaynak), İş Geliştirme (2 kaynak). Kaynaklar gerçek ve erişilebilir olmalı. SADECE JSON formatında yanıt ver, başka hiçbir şey yazma: {"resources": [{"title": "kaynak başlığı", "url": "https://...", "resource_type": "course veya article veya video veya tool veya book", "category": "design veya ai veya freelance veya business", "source": "platform adı örn YouTube, Udemy, Medium", "ai_summary": "neden faydalı 2 cümle Türkçe"}]}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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

    let parsed;
    try {
      parsed = parseClaudeJSON<any>(text);
    } catch {
      return NextResponse.json({ error: "AI geçersiz format döndürdü" }, { status: 500 });
    }

    if (!parsed.resources || !Array.isArray(parsed.resources)) {
       return NextResponse.json({ error: "AI resources array dönmedi" }, { status: 500 });
    }

    const today = new Date();
    const currWeek = getISOWeek(today);
    const currYear = getYear(today);

    const itemsToInsert = parsed.resources.map((r: any) => ({
       title: r.title,
       url: r.url,
       resource_type: r.resource_type,
       category: r.category,
       source: r.source,
       ai_summary: r.ai_summary,
       week_number: currWeek,
       year: currYear,
       is_saved: false,
       is_completed: false
    }));

    const { error } = await supabaseAdmin.from("learning_resources").insert(itemsToInsert);
    if (error) {
       console.error(error);
       return NextResponse.json({ error: "DB Insert hatası" }, { status: 500 });
    }

    return NextResponse.json({ message: "Başarılı", count: itemsToInsert.length });
  } catch (err) {
    console.error("Learning radar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
