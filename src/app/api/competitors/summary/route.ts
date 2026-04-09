import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { competitors } = body as { competitors: any[] };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    
    const systemPrompt = `Aşağıdaki Instagram hesaplarını GrafikCem (@grafikcem) perspektifinden analiz eden bir stratejistsin.
GrafikCem; koyu temalı carousel setleri (hayvan görselleri, serif+script tipografi, kırmızı/siyah palet), mikrofonsuz sinematik reels (desk setup, filmmaker estetiği, kaynak göstericisi) ve AI tasarım araçları içerikleri üretiyor.`;
    const competitorsStr = competitors.map((c: any) => `${c.handle} (${c.trend}) - Format: ${c.last_format} - Not: ${c.notes}`).join('\n');
    
    const userPrompt = `Rakip listesi:
${competitorsStr}

Her hesap için:
- İçerik formatı ve stili
- Hangi konular en çok etkileşim alıyor
- Carousel veya reels hangisini tercih ediyor
- GrafikCem bu hesaptan ne öğrenebilir

Son olarak:
- Bu hafta GrafikCem için 3 içerik fikri öner
- Rakiplerin kaçırdığı 2 fırsat alanı belirle`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
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

    return NextResponse.json({ summary: text });
  } catch (err: any) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
