import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseClaudeJSON } from "@/lib/parse-claude";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId } = body as { leadId: string };

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
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

    // 2. Call Claude API
    const systemPrompt = "Sen bir dijital pazarlama ve tasarım danışmanısın.";

    const promptText = `
Lütfen aşağıdaki potansiyel müşteri (lead) bilgilerini incele ve SADECE JSON formatında bir analiz döndür. Başka hiçbir açıklama, selamlama veya markdown tırnağı EKLEME.

FİYAT REHBERİ:
- Sadece Logo: 3000-8000 TL
- Sosyal Medya Yönetimi: 5000-15000 TL/ay
- Web Tasarımı: 8000-25000 TL
- AI Görsel Üretimi: 3000-10000 TL
- Marka + Sosyal Paket: 12000-35000 TL

LEAD BİLGİLERİ:
- İşletme Adı: ${lead.business_name}
- Sektör: ${lead.sector}
- Şehir: ${lead.city}
- Website: ${lead.website_url || "Yok"}
- Telefon: ${lead.contact_phone || "Yok"}

İSTENEN JSON FORMATI:
{
  "potential_score": Sayı (0-100),
  "has_website": Boolean (true/false),
  "website_score": Sayı (0-100),
  "ai_analysis": "String (2-3 cümle Türkçe analiz notu, işletmenin dijital varlığına dair mantıklı bir yorum)",
  "recommended_services": ["social_media", "logo", "web_design", "ai_visual", "brand_package"] içinden mantıklı 1-3 seçim listesi,
  "estimated_price_min": Sayı (TL cinsinden),
  "estimated_price_max": Sayı (TL cinsinden),
  "why_they_need_us": "String (1 cümle Türkçe, neden bize ihtiyaçları var)"
}
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
        max_tokens: 1000,
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
    let rawOutput = response.content[0].type === 'text' ? response.content[0].text : "";
    rawOutput = rawOutput.trim();
    if (rawOutput.startsWith("```json")) {
      rawOutput = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (rawOutput.startsWith("```")) {
      rawOutput = rawOutput.replace(/```/g, "").trim();
    }

    const parsedJson = parseClaudeJSON<any>(rawOutput);

    // 3. Update Supabase
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        potential_score: parsedJson.potential_score,
        has_website: parsedJson.has_website,
        website_score: parsedJson.website_score || 0,
        ai_analysis: parsedJson.ai_analysis,
        recommended_services: parsedJson.recommended_services || [],
        estimated_price_min: parsedJson.estimated_price_min,
        estimated_price_max: parsedJson.estimated_price_max,
        why_they_need_us: parsedJson.why_they_need_us,
        status: "researched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
