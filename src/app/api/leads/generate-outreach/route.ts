import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!validateApiRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { leadId, format, language } = body as { leadId: string; format: string; language: string };

    if (!leadId || !format || !language) {
      return NextResponse.json({ error: "Eksik parametreler (leadId, format, language gerekli)" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured (ANTHROPIC_API_KEY)" }, { status: 500 });
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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: promptText }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const response = await anthropicRes.json();
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
