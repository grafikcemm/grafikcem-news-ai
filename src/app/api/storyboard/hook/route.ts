import { NextRequest, NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, platform, format, tone } = body as { topic: string; platform: string; format: string; tone: string };

    if (!topic || !platform || !format || !tone) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const systemPrompt = `Sen GrafikCem (@grafikcem) için viral sosyal medya kancaları (hook) yazan bir içerik stratejistisin.
GrafikCem stili hook'lar şunlara odaklanır:
- Tasarım araçları, kaynaklar ve AI prompt tavsiyeleri
- 'Bu siteyi biliyor musun?' veya 'Bunu kimse söylemedi' gibi merak açıcı başlangıçlar
- Carousel için: 'Part 1/7' serisi formatı
- Reel için: İlk 0-3 saniye izleyiciyi çeken görsel hook ağırlığı (metin sadece destekleyici)
- Her zaman kaynak veya araç öneren, eğitici ve otoriter bir ton`;

    const userPrompt = `İçerik: ${topic}, Platform: ${platform}, Format: ${format}, Ton: ${tone}. GrafikCem tarzına uygun 3 farklı hook üret, her biri farklı psikolojik tetikleyici kullansın. SADECE JSON döndür, başka hiçbir şey yazma:
{
  "hooks": [
    { "text": "string (Ekranda görünecek metin/başlık)", "type": "string (örn: Merak Uyandırıcı / Soru / Negatif İfade)", "why": "string (Bu hook neden GrafikCem kitlesinde çalışır?)" },
    { "text": "string", "type": "string", "why": "string" },
    { "text": "string", "type": "string", "why": "string" }
  ]
}`;

    const text = await generateWithGemini(userPrompt, 'creative', systemPrompt);
    const parsed = parseAIJSON<any>(text);

    if (!parsed) {
      console.error("Gemini returned invalid or empty JSON for hooks:", text);
      return NextResponse.json({ error: "AI geçersiz format döndürdü" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Hook generate error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
