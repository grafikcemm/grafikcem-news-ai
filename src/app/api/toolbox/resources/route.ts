import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const favorites = searchParams.get('favorites')

  let query = supabaseAdmin
    .from('toolbox_resources')
    .select('*')
    .eq('is_active', true)
    .order('is_favorite', { ascending: false })
    .order('name', { ascending: true })

  if (category && category !== 'Tümü') {
    query = query.eq('category', category)
  }
  const subcategory = searchParams.get('subcategory')
  if (subcategory) {
    query = query.eq('subcategory', subcategory)
  }
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,subcategory.ilike.%${search}%,category.ilike.%${search}%`
    )
  }
  if (favorites === 'true') {
    query = query.eq('is_favorite', true)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
