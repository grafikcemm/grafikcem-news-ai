import { NextRequest, NextResponse } from 'next/server'
import { generateWithGeminiFast } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt boş olamaz' }, { status: 400 })
    }

    const trSystemPrompt = `Sen bir prompt optimizasyon uzmanısın.
Görevin: Verilen promptu anlam ve talimat kaybı olmadan
mümkün olduğunca az token kullanacak şekilde Türkçe olarak yeniden yaz.
KURALLAR:
- Çıktı Türkçe olacak
- Bağlaçları ve gereksiz kelimeleri kaldır
- Uzun açıklamaları kısa direktiflere dönüştür
- Anlam korunmalı, talimatlar eksiksiz kalmalı
- Sadece optimize edilmiş promptu yaz, açıklama ekleme
- "İşte optimizasyon:" gibi giriş cümlesi koyma`

    const enSystemPrompt = `You are a prompt optimization expert.
Your task: Rewrite the given prompt in English using as few tokens as possible
without losing meaning or instructions.
RULES:
- Output must be in English only
- Remove filler words, conjunctions, unnecessary phrases
- Convert long explanations into short directives
- Preserve all instructions and intent
- Output only the optimized prompt, no explanation
- No preamble like "Here is the optimized prompt:"`

    const [trResult, enResult] = await Promise.all([
      generateWithGeminiFast(
        `Token optimize et (Türkçe çıktı):\n\n${prompt}`,
        trSystemPrompt
      ),
      generateWithGeminiFast(
        `Token optimize et (English output):\n\n${prompt}`,
        enSystemPrompt
      ),
    ])

    return NextResponse.json({
      optimizedTR: trResult.trim(),
      optimizedEN: enResult.trim(),
    })
  } catch (err) {
    console.error('Token optimizer error:', err)
    return NextResponse.json({ error: 'Optimizasyon başarısız' }, { status: 500 })
  }
}
