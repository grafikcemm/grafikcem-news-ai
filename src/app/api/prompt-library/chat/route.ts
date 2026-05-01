import { NextRequest, NextResponse } from 'next/server'
import { generateWithGemini, DEEPSEEK_FLASH } from '@/lib/gemini'
import promptsMeta from '@/data/prompts_meta.json'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    const promptList = promptsMeta.map(p =>
      `[${p.category}] ${p.title_tr} (${p.id}) — ${p.description_tr} — Tags: ${p.tags?.join(', ')}`
    ).join('\n')

    const systemPrompt = `
Sen GrafikCem Prompt Kütüphanesi asistanısın. Ali Cem Bozma'nın özel prompt koleksiyonunu yönetiyorsun.

GÖREVİN:
Kullanıcının ne başarmak istediğini veya ne tür bir prompta ihtiyacı olduğunu anlayarak en uygun promptları öner.

KÜTÜPHANEDEKİ PROMPTLAR:
${promptList}

YANIT KURALLARI:
- Türkçe yanıt ver
- Sadece kütüphanede var olan promptlardan öner
- Her öneri için kısa bir açıklama ekle
- Maksimum 3 öneri ver
- Promptun adını ve ID'sini açıkça belirt ki kullanıcı arayabilsin (örn: "Marka Kimliği Brief Oluşturucu (gc_001)")
- Samimi, net ve yardımcı bir ton kullan
`

    const response = await generateWithGemini(
      message,
      'analytical',
      systemPrompt,
      DEEPSEEK_FLASH
    )

    return NextResponse.json({ response })
  } catch (err) {
    console.error('Prompt library chat error:', err)
    return NextResponse.json({ error: 'Yanıt alınamadı' }, { status: 500 })
  }
}
