import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { id, is_favorite } = await req.json()

  const { error } = await supabaseAdmin
    .from('toolbox_resources')
    .update({ is_favorite })
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
