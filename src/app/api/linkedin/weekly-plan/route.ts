import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { generateWithGemini, DEEPSEEK_FLASH } from '@/lib/gemini'
import { BRAND_DNA_SYSTEM_PROMPT, WEEKLY_PLAN_PROMPT } from '@/lib/linkedin-prompts'

export async function POST(req: NextRequest) {
  try {
    const { startDate } = await req.json()

    const { data: dna } = await supabase
      .from('linkedin_brand_dna')
      .select('*')
      .single()

    const { data: news } = await supabase
      .from('news_items')
      .select('id, title, category, viral_score')
      .gte('viral_score', 60)
      .order('viral_score', { ascending: false })
      .limit(14)

    const systemPrompt = dna
      ? BRAND_DNA_SYSTEM_PROMPT({
          targetAudience: dna.target_audience || 'Freelancerlar, KOBİ sahipleri, tasarımcılar',
          tone: dna.tone_description || 'Uzman abi, samimi, pratik',
          avoidTopics: dna.avoid_topics || 'Siyaset, tartışmalı gündem',
          expertiseAreas: dna.expertise_areas || 'Grafik tasarım, branding, AI araçları, freelance',
          postingGoal: dna.posting_goal || 'Otorite kurma ve müşteri çekme'
        })
      : ''

    const newsStr = JSON.stringify(news?.map(n => ({
      id: n.id, title: n.title, category: n.category, score: n.viral_score
    })))

    const raw = await generateWithGemini(
      WEEKLY_PLAN_PROMPT(newsStr, systemPrompt, startDate),
      'planning',
      undefined,
      DEEPSEEK_FLASH
    )

    const cleaned = raw.replace(/```json|```/g, '').trim()
    const plan = JSON.parse(cleaned)

    return NextResponse.json(plan)
  } catch (err) {
    console.error('Weekly plan error:', err)
    return NextResponse.json({ error: 'Plan oluşturulamadı' }, { status: 500 })
  }
}
