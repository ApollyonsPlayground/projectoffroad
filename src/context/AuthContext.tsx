'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/utils/supabase/client'

const supabase = createBrowserSupabaseClient()

/** True when `avatar_url` points at our public `avatars` bucket (custom upload). */
function isSupabaseHostedAvatar(
  avatarUrl: string | null | undefined,
  supabasePublicUrl: string | undefined,
): boolean {
  if (!avatarUrl || !supabasePublicUrl) return false
  const base = supabasePublicUrl.replace(/\/$/, '')
  return avatarUrl.includes(`${base}/storage/v1/object/public/avatars/`)
}

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

    // LAN / phone dev: first cookie read + profile can exceed 8s; avoid false "signed out".
    const SESSION_BOOT_MS = process.env.NODE_ENV === 'development' ? 30000 : 15000
    type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>
    const sessionBoot = new Promise<GetSessionResult>((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null }), SESSION_BOOT_MS)
    )

    Promise.race([supabase.auth.getSession(), sessionBoot])
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          void fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.warn('[Auth] getSession:', err)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        void fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      const session = (await supabase.auth.getSession()).data?.session
      if (!session?.user) {
        setProfile(null)
        return
      }

      const email =
        session.user.email?.trim() ||
        `${userId.replace(/-/g, '')}@oauth.placeholder.local`

      const googleName =
        (session.user.user_metadata?.full_name as string) ||
        (session.user.user_metadata?.name as string) ||
        session.user.email?.split('@')[0] ||
        'Rider'

      const avatar_url = (session.user.user_metadata?.avatar_url as string) || null

      const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      const { data: existing, error: selErr } = await supabase
        .from('users')
        .select('id, sync_display_name_from_google, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (selErr) console.warn('[Auth] profile select:', selErr.message)

      if (!existing) {
        const { error: insErr } = await supabase.from('users').insert({
          id: userId,
          email,
          name: googleName,
          avatar_url,
          sync_display_name_from_google: false,
        })
        if (insErr?.code === '23505') {
          const { data: raceRow } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('id', userId)
            .maybeSingle()
          const raceAvatar = raceRow?.avatar_url ?? null
          const racePatch: Record<string, unknown> = { email }
          if (!isSupabaseHostedAvatar(raceAvatar, supabasePublicUrl)) {
            racePatch.avatar_url = avatar_url
          }
          const { error: raceUpd } = await supabase.from('users').update(racePatch).eq('id', userId)
          if (raceUpd) console.warn('[Auth] profile race update:', raceUpd.message)
        } else if (insErr) {
          console.warn('[Auth] profile insert:', insErr.message)
        }
      } else {
        const storedAvatar = (existing as { avatar_url?: string | null }).avatar_url ?? null
        const customLocked = isSupabaseHostedAvatar(storedAvatar, supabasePublicUrl)

        const patch: Record<string, unknown> = { email }
        if (!customLocked) {
          patch.avatar_url = avatar_url
        }
        if (existing.sync_display_name_from_google === true) {
          patch.name = googleName
        }
        const { error: updErr } = await supabase.from('users').update(patch).eq('id', userId)
        if (updErr) console.warn('[Auth] profile update:', updErr.message)
      }

      // maybeSingle: avoids 406 when row still missing after a failed upsert
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (!error && data) setProfile(data)
    } catch (e) {
      console.warn('[Auth] fetchProfile:', e)
    } finally {
      setLoading(false)
    }
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
    let nextAfterLogin = '/feed/'
    if (typeof window !== 'undefined') {
      const raw = new URLSearchParams(window.location.search).get('next')
      if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) {
        nextAfterLogin = raw.length > 2048 ? '/feed/' : raw
      }
    }
    const qs = `next=${encodeURIComponent(nextAfterLogin)}`
    const redirectTo = origin ? `${origin}${callbackPath}?${qs}` : `${callbackPath}?${qs}`

    let oauth: Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>;
    try {
      oauth = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Full top-level navigation avoids some mobile browsers blocking the
          // library’s default redirect when it runs right after an async gap.
          skipBrowserRedirect: true,
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        error: `Could not reach Supabase (${msg}). Open /api/health/supabase on this site; confirm the project is active in the Supabase dashboard and Vercel env has NEXT_PUBLIC_SUPABASE_URL + anon/publishable key.`,
      }
    }

    const { data, error } = oauth

    if (error) {
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

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return { error: null }
    }

    return {
      error:
        'Could not start Google sign-in (empty auth URL). Try Safari/Chrome directly (not an in-app browser), or disable strict tracking/ad blockers for this site.',
    }
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
