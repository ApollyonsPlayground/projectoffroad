import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('run_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!runId) {
      return NextResponse.json({ error: 'run_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, user:users(id, name, avatar_url)')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { run_id, user_id, content } = await request.json()

    const { data, error } = await supabase
      .from('messages')
      .insert({ run_id, user_id, content })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', user_id)
      .single()

    return NextResponse.json({ ...data, user: userData })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
