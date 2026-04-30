import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateWithGemini, GEMINI_STANDARD } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    // Tüm aktif kaynakları çek (asistan bağlamı için)
    const { data: resources } = await supabaseAdmin
      .from('toolbox_resources')
      .select('name, url, description, category, subcategory, tags')
      .eq('is_active', true)

    const resourceList = resources?.map(r =>
      `[${r.category} > ${r.subcategory}] ${r.name} — ${r.description} (${r.url})`
    ).join('\n') || ''

    const systemPrompt = `
Sen GrafikCem Toolbox asistanısın. Ali Cem Bozma'nın kişisel kaynak kütüphanesini yönetiyorsun.

GÖREVİN:
Kullanıcının ne aradığını anlayarak en uygun araçları/kaynakları öner.
Hem Toolbox içindeki kaynaklardan hem de genel bilginden yararlan.

TOOLBOX'TAKİ KAYNAKLAR:
${resourceList}

YANIT KURALLARI:
- Türkçe yanıt ver
- Toolbox'ta varsa önce oradan öner, URL'i de ver
- Toolbox'ta yoksa genel bilginden ekstra öneri yapabilirsin
- Her öneri için kısa bir açıklama ekle (1 cümle)
- Maksimum 5 öneri ver
- Samimi ve direkt ol, gereksiz giriş yapma
- Format: isim — açıklama — url şeklinde listele
`

    const response = await generateWithGemini(
      message,
      'analytical',
      systemPrompt,
      GEMINI_STANDARD
    )

    return NextResponse.json({ response })
  } catch (err) {
    console.error('Toolbox chat error:', err)
    return NextResponse.json({ error: 'Yanıt alınamadı' }, { status: 500 })
  }
}
