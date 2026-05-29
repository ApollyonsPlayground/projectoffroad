import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { disabledLegacyApiResponse } from '@/lib/api/security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const verified = searchParams.get('verified')

    let query = supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (verified === 'true') {
      query = query.eq('verified', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Could not load clubs' }, { status: 400 })
    }

    const clubs = (data ?? []) as { id: string }[]
    const ids = [...new Set(clubs.map((c) => String(c.id)).filter(Boolean))]
    const countByClub: Record<string, number> = {}
    if (ids.length) {
      const { data: memRows } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('status', 'approved')
        .in('club_id', ids)
      for (const row of memRows ?? []) {
        const cid = String((row as { club_id: string }).club_id)
        countByClub[cid] = (countByClub[cid] ?? 0) + 1
      }
    }

    const enriched = clubs.map((c) => ({
      ...(c as Record<string, unknown>),
      member_count: countByClub[String(c.id)] ?? 0,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Clubs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  return disabledLegacyApiResponse()
}
