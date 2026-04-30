import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Build a Supabase client that forwards the caller's auth token so RLS works
function makeClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? null
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  })
  return client
}

export async function GET(request: NextRequest) {
  try {
    const supabase = makeClient(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'upcoming'
    const clubId = searchParams.get('club_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('runs')
      .select(`
        *,
        club:clubs(id, name, logo)
      `)
      .eq('status', status)
      .order('date', { ascending: true })
      .limit(limit)

    if (clubId) {
      query = query.eq('club_id', clubId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Runs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = makeClient(request)
    const body = await request.json()
    const { club_id, trail_id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements } = body

    const { data, error } = await supabase
      .from('runs')
      .insert({
        club_id,
        trail_id,
        title,
        description,
        date,
        meetup_location,
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
