import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getISOWeek, getYear } from "date-fns";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(request: NextRequest) {
  try {
    const systemPrompt = "Sen bir tasarım ve AI alanında uzman kaynak küratörüsün.";
    const userPrompt = `Ali Cem Bozma, İstanbul'da freelance grafik tasarımcı. Uzmanlıkları: logo tasarımı, sosyal medya yönetimi, AI görsel üretimi, web tasarımı. Bu hafta için şu kategorilerde 8 kaynak öner: Tasarım (2 kaynak), AI (2 kaynak), Freelance (2 kaynak), İş Geliştirme (2 kaynak). Kaynaklar gerçek ve erişilebilir olmalı. SADECE JSON formatında yanıt ver, başka hiçbir şey yazma: {"resources": [{"title": "kaynak başlığı", "url": "https://...", "resource_type": "course veya article veya video veya tool veya book", "category": "design veya ai veya freelance veya business", "source": "platform adı örn YouTube, Udemy, Medium", "ai_summary": "neden faydalı 2 cümle Türkçe"}]}`;

    const text = await generateWithGemini(userPrompt, 'planning', systemPrompt);

    let parsed;
    const jsonParsed = parseAIJSON<any>(text);
    if (!jsonParsed) {
      console.error("[learning-radar] Gemini return invalid JSON:", text);
      return NextResponse.json({ error: "AI geçersiz format döndürdü" }, { status: 500 });
    }
    parsed = jsonParsed;

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
  } catch (err: any) {
    console.error("Learning radar error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
