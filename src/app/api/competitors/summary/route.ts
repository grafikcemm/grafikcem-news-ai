import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { competitors } = body as { competitors: any[] };
    
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

    const text = await generateWithGemini(userPrompt, 'analytical', systemPrompt);

    return NextResponse.json({ summary: text });
  } catch (err: any) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
