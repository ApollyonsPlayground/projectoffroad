'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient, User, SupabaseClient } from '@supabase/supabase-js'

// Guard: never call createClient with undefined — this was crashing the entire app
function makeSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

const supabase = makeSupabaseClient()

// profile is Record<string,unknown> but always contains at least { role?: string }
interface AuthContextType {
  user: User | null
  profile: Record<string, unknown> | null
  loading: boolean
  isConfigured: boolean
  supabaseClient: SupabaseClient | null
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const isConfigured = supabase !== null

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    if (!supabase) return
    // Upsert: ensure user record exists with data from Google session
    const session = (await supabase.auth.getSession()).data?.session
    if (session?.user) {
      const { error: upsertError } = await supabase.from('users').upsert(
        {
          id: userId,
          name: (session.user.user_metadata?.full_name as string) || session.user.email?.split('@')[0] || 'Rider',
          email: session.user.email ?? '',
          avatar_url: (session.user.user_metadata?.avatar_url as string) || null,
          role: 'user',
        },
        { onConflict: 'id' }
      )
      if (upsertError) console.error('[v0] upsert error:', upsertError)
    }
    // Fetch profile after upsert
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function refreshProfile() {
    if (!supabase || !user) return
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!error && data) setProfile(data)
  }

  async function signInWithGoogle() {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '/',
      },
    })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isConfigured, supabaseClient: supabase, signOut, signInWithGoogle, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
