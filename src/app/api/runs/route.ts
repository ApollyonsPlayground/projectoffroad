import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'upcoming'
    const clubId = searchParams.get('club_id')
    const limit = parseInt(searchParams.get('limit') || '20')

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
      return NextResponse.json({ error: lastError.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Runs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const body = await request.json()
    const {
      club_id,
      trail_id,
      title,
      description,
      date,
      meetup_location,
      meetup_latitude,
      meetup_longitude,
      difficulty,
      max_participants,
      vehicle_requirements,
    } = body

    const { data, error } = await supabase
      .from('runs')
      .insert({
        club_id,
        trail_id,
        title,
        description,
        date,
        meetup_location,
        meetup_latitude,
        meetup_longitude,
        difficulty,
        max_participants,
        vehicle_requirements,
        status: 'upcoming'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Runs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
