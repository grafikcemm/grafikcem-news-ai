import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { generateWithGemini, GEMINI_STANDARD } from '@/lib/gemini'
import {
  BRAND_DNA_SYSTEM_PROMPT,
  LINKEDIN_POST_PROMPT,
  VIRAL_ANALYSIS_PROMPT
} from '@/lib/linkedin-prompts'

export async function POST(req: NextRequest) {
  try {
    const { format, input, sourceNewsId } = await req.json()

    // Brand DNA'yı çek
    const { data: dna } = await supabase
      .from('linkedin_brand_dna')
      .select('*')
      .single()

    // Viral örnekleri çek
    const { data: viralExamples } = await supabase
      .from('viral_references')
      .select('tweet_text, format, engagement_score')
      .eq('is_active', true)
      .order('engagement_score', { ascending: false })
      .limit(5)

    const viralContext = viralExamples?.length 
      ? `\n\nREFERANS ÖRNEKLERİ (bu tarz ve tonda yaz):\n${viralExamples.map((e, i) => 
          `Örnek ${i + 1} (${e.format}, skor: ${e.engagement_score}):\n${e.tweet_text}`).join('\n\n---\n\n')}`
      : ''

    const systemPrompt = (dna
      ? BRAND_DNA_SYSTEM_PROMPT({
          targetAudience: dna.target_audience || 'Freelancerlar, KOBİ sahipleri, tasarımcılar',
          tone: dna.tone_description || 'Uzman abi, samimi, pratik',
          avoidTopics: dna.avoid_topics || 'Siyaset, tartışmalı gündem',
          expertiseAreas: dna.expertise_areas || 'Grafik tasarım, branding, AI araçları, freelance',
          postingGoal: dna.posting_goal || 'Otorite kurma ve müşteri çekme'
        })
      : '') + viralContext

    if (format === 'ANALYSIS_ONLY') {
      const viralRaw = await generateWithGemini(
        VIRAL_ANALYSIS_PROMPT(input),
        'analytical',
        undefined,
        GEMINI_STANDARD
      )
      const viralCleaned = viralRaw.replace(/```json|```/g, '').trim()
      const viralResult = JSON.parse(viralCleaned)

      return NextResponse.json({
        total_score: viralResult.total_score,
        breakdown: viralResult.breakdown,
        signals: viralResult.signals,
        weak_points: viralResult.weak_points,
        improvement_tip: viralResult.improvement_tip
      })
    }

    const prompt = LINKEDIN_POST_PROMPT(format, input, systemPrompt)
    const raw = await generateWithGemini(prompt, 'creative', undefined, GEMINI_STANDARD)

    // JSON parse
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    // Viral analizi yap
    const viralRaw = await generateWithGemini(
      VIRAL_ANALYSIS_PROMPT(result.post),
      'analytical',
      undefined,
      GEMINI_STANDARD
    )
    const viralCleaned = viralRaw.replace(/```json|```/g, '').trim()
    const viralResult = JSON.parse(viralCleaned)

    // Supabase'e kaydet
    const { data: saved } = await supabase
      .from('linkedin_posts')
      .insert({
        source_news_id: sourceNewsId || null,
        source_type: sourceNewsId ? 'news' : 'manual',
        raw_input: input,
        format,
        generated_content: result.post,
        viral_score: viralResult.total_score,
        viral_signals: viralResult.signals,
        status: 'draft'
      })
      .select()
      .single()

    return NextResponse.json({
      post: result.post,
      hook: result.hook,
      charCount: result.char_count,
      viralScore: viralResult.total_score,
      viralBreakdown: viralResult.breakdown,
      viralSignals: viralResult.signals,
      weakPoints: viralResult.weak_points,
      improvementTip: viralResult.improvement_tip,
      savedId: saved?.id
    })
  } catch (err) {
    console.error('LinkedIn generate error:', err)
    return NextResponse.json({ error: 'Üretim başarısız' }, { status: 500 })
  }
}
