'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/utils/supabase/client'

const supabase = createBrowserSupabaseClient()

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
      const email =
        session.user.email?.trim() ||
        `${userId.replace(/-/g, '')}@oauth.placeholder.local`

      // Omit `role` on upsert so existing owner/admin rows are not reset to 'user'.
      const { error: upsertError } = await supabase.from('users').upsert(
        {
          id: userId,
          email,
          name:
            (session.user.user_metadata?.full_name as string) ||
            (session.user.user_metadata?.name as string) ||
            session.user.email?.split('@')[0] ||
            'Rider',
          avatar_url: (session.user.user_metadata?.avatar_url as string) || null,
        },
        { onConflict: 'id' }
      )
      if (upsertError) console.warn('[Auth] profile upsert:', upsertError.message)
    }
    // maybeSingle: avoids 406 when row still missing after a failed upsert
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
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
      .maybeSingle()
    if (!error && data) setProfile(data)
  }

  async function signInWithGoogle() {
    if (!supabase) return { error: 'Supabase is not configured.' }

    // Always use the current browser origin — avoids broken flows when
    // NEXT_PUBLIC_SITE_URL points at prod while testing on localhost.
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const callbackPath = '/auth/callback/'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin ? `${origin}${callbackPath}` : callbackPath,
      },
    })

    if (!error) return { error: null }

    const raw = error.message ?? ''
    const providerDisabled =
      raw.toLowerCase().includes('provider is not enabled') ||
      raw.toLowerCase().includes('unsupported provider') ||
      (error as { code?: string }).code === 'validation_failed'

    if (providerDisabled) {
      return {
        error:
          'Google sign-in is disabled in Supabase. Dashboard → Authentication → Providers → Google: enable it, add Client ID/Secret, and in Google Cloud set redirect URI to https://YOUR_REF.supabase.co/auth/v1/callback — see instruction.md.',
      }
    }

    return { error: raw || null }
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
