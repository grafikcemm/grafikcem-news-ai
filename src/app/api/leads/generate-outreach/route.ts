import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { leadId, format, language } = await req.json();

    if (!leadId || !format || !language) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    // 1. Fetch Lead
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Call Claude
    const systemPrompt = "Sen GrafikCem Creative Studio adına yazan bir iş geliştirme uzmanısın. GrafikCem; logo tasarımı, sosyal medya yönetimi, web tasarımı ve AI görsel üretimi hizmetleri sunan İstanbul merkezli bir freelance tasarım stüdyosudur.";

    let formatRules = "";
    if (format === "email") {
      formatRules = "Konu satırı (Subject:) ile başla. Maksimum 3 paragraf. Profesyonel ama samimi bir dil kullan. Harekete geçirici mesaj olarak 15 dakikalık ücretsiz dijital Check-up görüşmesi teklif et.";
    } else if (format === "instagram_dm") {
      formatRules = "Kısa ve merak uyandıran 3-4 cümle. Samimi ve enerjik ol. Emojiler kullan.";
    } else if (format === "linkedin") {
      formatRules = "Kısa, B2B tonuna uygun, profesyonel ve değer odaklı. Şirketin büyümesine odaklan.";
    }

    const languageRule = language === "en" ? "Lütfen İngilizce yaz." : "Lütfen Türkçe yaz.";

    const promptText = `
Aşağıdaki potansiyel müşteri için bir ${format} mesajı metni oluştur.

MÜŞTERİ BİLGİLERİ:
- İşletme Adı: ${lead.business_name}
- Sektör: ${lead.sector}
- Şehir: ${lead.city}
- Website: ${lead.website_url || "Yok"}
- AI Analizi (Not): ${lead.ai_analysis || "Yok"}
- Önerilen Hizmetler: ${(lead.recommended_services || []).join(", ")}
- Tahmini Bütçe İhtiyacı: ${lead.estimated_price_min} - ${lead.estimated_price_max} TL

KURALLAR:
1. ${formatRules}
2. ${languageRule}
3. SADECE mesaj metnini döndür, hiçbir markdown veya onaylama cümlesi yazma. (Eğer format email ise Subject: ... kısmı en üstte olmalı).
`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: promptText }],
    });

    let generatedText = response.content[0].type === 'text' ? response.content[0].text : "";
    generatedText = generatedText.trim();

    // 3. Save to lead_contacts and update lead status
    const { data: contactInsert, error: contactError } = await supabaseAdmin
      .from("lead_contacts")
      .insert({
        lead_id: lead.id,
        contact_type: format,
        content: generatedText,
      })
      .select()
      .single();

    if (contactError) {
      throw contactError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        status: "contacted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, text: generatedText, contact: contactInsert });
  } catch (error: any) {
    console.error("Outreach Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
