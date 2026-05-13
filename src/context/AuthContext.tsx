'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/utils/supabase/client'
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl'
import { isCapacitorNative } from '@/utils/capacitator/isNative'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

const supabase = createBrowserSupabaseClient()

/**
 * True when `avatar_url` is an object in our Storage `avatars` bucket (profile upload).
 * We match on the path, not the hostname: OAuth sync used to overwrite uploads whenever
 * NEXT_PUBLIC_SUPABASE_URL didn’t exactly match the URL returned by `getPublicUrl`.
 */
function isAppManagedProfilePhoto(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false
  const normalized = ensureStoragePublicObjectUrl(avatarUrl.trim()) || avatarUrl.trim()
  return normalized.includes('/storage/v1/object/public/avatars/')
}

/** Display name + avatar from Google / Apple (and other OIDC) user_metadata. */
function oauthDisplayNameAndAvatar(meta: Record<string, unknown> | undefined | null): {
  name: string
  avatar_url: string | null
} {
  const m = meta ?? {}
  let name = ''
  if (typeof m.full_name === 'string' && m.full_name.trim()) name = m.full_name.trim()
  else if (typeof m.name === 'string' && m.name.trim()) name = m.name.trim()
  else if (m.name && typeof m.name === 'object') {
    const o = m.name as Record<string, unknown>
    const g = typeof o.given_name === 'string' ? o.given_name : ''
    const f = typeof o.family_name === 'string' ? o.family_name : ''
    name = `${g} ${f}`.trim()
  }
  if (!name && typeof m.email === 'string' && m.email.includes('@')) {
    name = m.email.split('@')[0] ?? ''
  }
  if (!name) name = 'Rider'
  const avatar_url =
    (typeof m.avatar_url === 'string' && m.avatar_url.trim()) ||
    (typeof m.picture === 'string' && m.picture.trim()) ||
    null
  return { name, avatar_url }
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
  signInWithApple: () => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const isConfigured = supabase !== null

  const fetchProfile = useCallback(async (userId: string) => {
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

      const { name: oauthName, avatar_url } = oauthDisplayNameAndAvatar(
        session.user.user_metadata as Record<string, unknown> | undefined
      )

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
          name: oauthName,
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
          if (!isAppManagedProfilePhoto(raceAvatar)) {
            racePatch.avatar_url = avatar_url
          }
          const { error: raceUpd } = await supabase.from('users').update(racePatch).eq('id', userId)
          if (raceUpd) console.warn('[Auth] profile race update:', raceUpd.message)
        } else if (insErr) {
          console.warn('[Auth] profile insert:', insErr.message)
        }
      } else {
        const storedAvatar = (existing as { avatar_url?: string | null }).avatar_url ?? null
        const customLocked = isAppManagedProfilePhoto(storedAvatar)

        const patch: Record<string, unknown> = { email }
        if (!customLocked) {
          patch.avatar_url = avatar_url
        }
        if (existing.sync_display_name_from_google === true) {
          patch.name = oauthName
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
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Capacitor native: complete OAuth PKCE via deep link in the same app storage context.
    // This avoids "PKCE code verifier not found in storage" which happens when auth
    // was initiated in the WebView but completed in a separate browser context.
    let appUrlListener: Promise<{ remove: () => Promise<void> }> | null = null
    if (isCapacitorNative()) {
      appUrlListener = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const u = new URL(url)
          const code = u.searchParams.get('code')
          if (!code) return

          // Exchange in-app (needs the PKCE verifier stored by signInWithOAuth).
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          await Browser.close().catch(() => {})

          if (error) {
            console.warn('[Auth] exchangeCodeForSession:', error.message)
            return
          }

          // If caller included `next`, go there; otherwise default to /feed/.
          const next = u.searchParams.get('next')
          const dest =
            next && next.startsWith('/') && !next.startsWith('//') && !next.includes('://')
              ? next
              : '/feed/'
          window.location.assign(dest)
        } catch (e) {
          console.warn('[Auth] appUrlOpen parse:', e)
        }
      })
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

    return () => {
      subscription.unsubscribe()
      void appUrlListener?.then((h) => void h.remove())
    }
  }, [fetchProfile])

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

  async function signInWithOAuthProvider(
    provider: 'google' | 'apple',
    disabledHelp: string,
    emptyUrlHelp: string
  ): Promise<{ error: string | null }> {
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
    const native = isCapacitorNative()
    // Native apps: route the provider back to the WEBSITE callback with `native=1`,
    // then the website immediately bounces into the app deep link. This is more reliable
    // than asking the provider to deep-link directly (some flows ignore redirectTo).
    const redirectTo = native
      ? origin
        ? `${origin}${callbackPath}?native=1&${qs}`
        : `${callbackPath}?native=1&${qs}`
      : origin
        ? `${origin}${callbackPath}?${qs}`
        : `${callbackPath}?${qs}`

    let oauth: Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>
    try {
      oauth = await supabase.auth.signInWithOAuth({
        provider,
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
        return { error: disabledHelp }
      }

      return { error: raw || null }
    }

    if (data?.url && typeof window !== 'undefined') {
      if (native) {
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover',
        })
      } else {
        window.location.assign(data.url)
      }
      return { error: null }
    }

    return { error: emptyUrlHelp }
  }

  async function signInWithGoogle() {
    return signInWithOAuthProvider(
      'google',
      'Google sign-in is disabled in Supabase. Dashboard → Authentication → Providers → Google: enable it, add Client ID/Secret, and in Google Cloud set redirect URI to https://YOUR_REF.supabase.co/auth/v1/callback — see instruction.md.',
      'Could not start Google sign-in (empty auth URL). Try Safari/Chrome directly (not an in-app browser), or disable strict tracking/ad blockers for this site.'
    )
  }

  async function signInWithApple() {
    return signInWithOAuthProvider(
      'apple',
      'Apple sign-in is disabled or incomplete in Supabase. Dashboard → Authentication → Providers → Apple: enable, add Services ID, Secret Key (JWT), Team ID, Key ID — see instruction.md.',
      'Could not start Apple sign-in (empty auth URL). Use Safari or Chrome (not an in-app browser), or disable strict tracking/ad blockers for this site.'
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured,
        supabaseClient: supabase,
        signOut,
        signInWithGoogle,
        signInWithApple,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
