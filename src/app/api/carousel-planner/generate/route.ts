import { NextRequest, NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(req: NextRequest) {
  try {
    const { competitors, existingSeries, weekNumber } = await req.json();

    const prompt = `Sen @grafikcem için haftalık carousel içerik planı oluşturan bir strateji uzmanısın.

@grafikcem hakkında:
- İstanbul'da freelance grafik tasarımcı
- Koyu temali carousel setleri üretiyor (siyah/koyu arka plan, hayvan görselleri, serif+script tipografi)
- Kırmızı/siyah renk paleti
- Hedef kitle: tasarımcılar, AI kullananlar, freelancerlar
- Platform: Instagram (@grafikcem)

TAKİP EDİLEN RAKİP HESAPLAR:
${competitors?.join(', ') || 'Yok'}

MEVCUT SERİLERİM (zaten mevcut, tekrar etme, bunların devamı veya yeni konular öner):
${existingSeries || 'Yok'}

GÖREV:
Bu hesapların içerik trendlerini ve @grafikcem'in mevcut serilerini analiz ederek bu hafta için 5 carousel fikri öner.

Her fikir için şunları belirt:
- Seri adı (kısa, güçlü)
- Konu (ne hakkında)
- Neden viral olabilir?
- Kaç part olmalı?
- İlk part'ın hook'u (ilk slide'da ne yazmalı?)
- Rakip hangi hesabın hangi içeriğinden ilham alındı?
- @grafikcem'in mevcut serilerinden farkı ne?

SADECE JSON formatında yanıt ver:
{
  "week": ${weekNumber || 1},
  "strategy_note": "Bu haftanın genel stratejik notu",
  "plans": [
    {
      "rank": 1,
      "series_name": "Seri adı",
      "topic": "Konu açıklaması",
      "why_viral": "Viral olma gerekçesi",
      "parts": 7,
      "hook": "İlk slide hook metni",
      "inspiration": "@hesapadi — hangi tür içerik",
      "differentiation": "Diğer serilerden farkı",
      "content_type": "resource_list / tutorial / comparison / trend / mindset",
      "estimated_engagement": "high / medium / experimental"
    }
  ]
}`;

    const text = await generateWithGemini(prompt, 'planning');
    const parsed = parseAIJSON(text);

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI JSON" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: parsed });
  } catch (error: any) {
    console.error("Carousel Planning error:", error);
    return NextResponse.json({ error: error.message || "Plan oluşturulurken hata oluştu" }, { status: 500 });
  }
}
