import { NextRequest, NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, format, location } = body as { idea: string; format: string; location: string };

    if (!idea || !format || !location) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const systemPrompt = `Sen GrafikCem (@grafikcem) için içerik üretiyorsun.
GrafikCem'in içerik stili:
- MİKROFON YOK: Tüm reels'ler sessiz veya müzik overlay ile çekilir, seslendirme yoktur. Metin overlay veya caption ile anlatım yapılır.
- DESK SETUP ODAKLI: Masa üstü, ekran, klavye, araçlar çoğunlukla frame'de görünür
- FİLMMAKER ESTETİĞİ: Sinematik, slow motion, macro çekimler, dramatic lighting, depth of field
- KAYNAK GÖSTERMELİ: Reel izleyiciyi ekranda tutar, sonunda kaynak/araç gösterir
- HAYVAN VİZYELİ: Carousel'lerde güçlü hayvan görselleri kullanılır (kartal, aslan, leopar, at, baykuş gibi)
- RENK PALETİ: Koyu arka plan (siyah/bordo), kırmızı accent, beyaz tipografi
- TİPOGRAFİ: Serif bold (başlık) + script italic (alt başlık) kombinasyonu
- iPhone 16 Pro Max ile çekilir, Sinema modu, 4K`;

    const userPrompt = `İçerik: ${idea}, Format: ${format}, Yer: ${location}. 6 sahnelik detaylı storyboard oluştur. SADECE JSON döndür:
{
  "title": "string",
  "total_duration": "string",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "string",
      "description": "string",
      "angle": "string (örn: Low angle / Macro / Overhead vb.)",
      "movement": "string (örn: Sabit / Yavaş zoom / Pan vb.)",
      "lighting": "string",
      "text_overlay": "string (ses olmadığı için ekrandaki metin)",
      "music_suggestion": "string (mood: dark cinematic / epic / minimal techno / lo-fi)",
      "iphone_tip": "string (iPhone 16 Pro Max teknik notu)"
    }
  ],
  "general_tips": {
    "microphone_note": "Seslendirme yok, overlay metin kullanılacak",
    "stabilization": "string",
    "settings": "string",
    "editing_note": "string"
  }
}`;

    const text = await generateWithGemini(userPrompt, 'creative', systemPrompt);
    const parsed = parseAIJSON<any>(text);

    if (!parsed) {
      console.error("Gemini returned invalid or empty JSON for storyboard:", text);
      return NextResponse.json({ error: "AI geçersiz format döndürdü" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Storyboard generate error:", err);
    return NextResponse.json({ error: `Storyboard oluşturma hatası: ${err.message || 'Bilinmeyen hata'}` }, { status: 500 });
  }
}
