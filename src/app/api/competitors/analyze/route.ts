import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured (ANTHROPIC_API_KEY)" }, { status: 500 });
    }

    // Fetch all handles from competitors table
    const { data: competitors, error: fetchError } = await supabaseAdmin
      .from("competitors")
      .select("handle");

    if (fetchError) {
      throw new Error("Rakipler veritabanından çekilemedi: " + fetchError.message);
    }

    const handles = competitors?.map(c => c.handle) || [];
    if (handles.length === 0) {
      return NextResponse.json({ error: "Analiz edilecek rakip hesabı bulunamadı." }, { status: 400 });
    }

    const systemPrompt = "Sen kıdemli bir sosyal medya stratejistisin. Sektörel rakipleri analiz ederek Ali Cem (@grafikcem) için stratejik raporlar hazırlarsın.";
    
    const userPrompt = `Aşağıdaki sosyal medya hesapları hakkında bildiklerini anlat. 
Her biri için: içerik stili, format tercihi, tahmini takipçi kitlesi, güçlü yönleri ve Ali Cem için ne gibi bir ders çıkarılabilir sorusuna yanıt ver.

Hesaplar: ${handles.join(", ")}

Lütfen Türkçe, profesyonel ve aksiyon odaklı bir analiz raporu sun.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
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
    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Save results to competitor_analysis table
    const { error: saveError } = await supabaseAdmin
      .from("competitor_analysis")
      .insert({
        handles: handles,
        analysis_text: text
      });

    if (saveError) {
      console.error("Analiz kaydedilemedi:", saveError);
      return NextResponse.json({ analysis: text, warning: "Analiz üretildi ancak kaydedilemedi: " + saveError.message });
    }

    return NextResponse.json({ analysis: text });
  } catch (err: any) {
    console.error("Rakip analiz hatası:", err);
    return NextResponse.json({ error: "Analiz başarısız: " + (err.message || "Bilinmeyen hata") }, { status: 500 });
  }
}

// GET to fetch the latest analysis
export async function GET(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const { data, error } = await supabaseAdmin
      .from("competitor_analysis")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return NextResponse.json(data?.[0] || null);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
