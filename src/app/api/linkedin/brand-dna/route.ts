import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase.from('linkedin_brand_dna').select('*').single()
  return NextResponse.json(data || {})
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data: existing } = await supabase.from('linkedin_brand_dna').select('id').single()

  if (existing?.id) {
    await supabase.from('linkedin_brand_dna').update({
      target_audience: body.targetAudience,
      tone_description: body.toneDescription,
      avoid_topics: body.avoidTopics,
      reference_posts: body.referencePosts,
      expertise_areas: body.expertiseAreas,
      posting_goal: body.postingGoal,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    await supabase.from('linkedin_brand_dna').insert({
      target_audience: body.targetAudience,
      tone_description: body.toneDescription,
      avoid_topics: body.avoidTopics,
      reference_posts: body.referencePosts,
      expertise_areas: body.expertiseAreas,
      posting_goal: body.postingGoal
    })
  }
  return NextResponse.json({ success: true })
}
