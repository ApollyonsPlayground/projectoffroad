import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { disabledLegacyApiResponse } from '@/lib/api/security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'upcoming'
    const clubId = searchParams.get('club_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const selectAttempts = [
      `*, club:clubs(id, name, logo)`,
      `*, club:clubs(name)`,
      '*',
    ]

    let data: unknown = null
    let lastError: { message: string } | null = null

    for (const sel of selectAttempts) {
      let q = supabase
        .from('runs')
        .select(sel)
        .eq('status', status)
        .order('date', { ascending: true })
        .limit(limit)

      if (clubId) {
        q = q.eq('club_id', clubId)
      }

      const res = await q
      if (!res.error) {
        data = res.data
        lastError = null
        break
      }
      lastError = res.error
    }

    if (lastError) {
      return NextResponse.json({ error: 'Could not load runs' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Runs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  return disabledLegacyApiResponse()
}
