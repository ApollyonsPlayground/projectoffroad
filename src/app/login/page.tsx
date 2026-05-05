'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signInWithGoogle } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err === 'auth_callback') {
      const msg = params.get('message')
      showToast(msg ? decodeURIComponent(msg) : 'Sign-in failed after Google redirect.', 'error')
      window.history.replaceState({}, '', `${window.location.pathname}`)
      return
    }
    if (err === 'play_review') {
      const msg = params.get('message')
      showToast(msg ? decodeURIComponent(msg) : 'Review sign-in failed.', 'error')
      window.history.replaceState({}, '', `${window.location.pathname}`)
    }
  }, [showToast])

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      showToast(err, 'error')
      setGoogleLoading(false)
    }
    // On success Supabase redirects the browser — no manual navigation needed
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-xs flex flex-col items-center gap-10">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/40">
            <span className="text-black font-black text-[18px] tracking-tight">SO</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-black text-white text-[28px] tracking-tight leading-none">
              SoCal<span className="text-orange-500">Offroaders</span>
            </span>
            <p className="text-zinc-500 text-[13px] text-center leading-snug max-w-[220px]">
              Official Google Authentication Required for Trail Access.
            </p>
          </div>
        </div>

        {/* Google sign-in — sole CTA */}
        <div className="w-full flex flex-col items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.015 }}
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3.5 py-5 rounded-2xl border-2 border-[#FF8C00] bg-black text-white font-bold text-[17px] hover:bg-[#FF8C00]/8 transition-colors shadow-lg shadow-[#FF8C00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign in with Google"
          >
            {googleLoading ? (
              <Loader2 size={22} className="animate-spin text-[#FF8C00]" />
            ) : (
              /* Official Google 'G' logo colours */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>

          <p className="text-[11px] text-zinc-700 text-center max-w-[240px] leading-relaxed">
            By continuing you agree to our community guidelines. Your Google account is the only sign-in method.
          </p>
        </div>

      </div>
    </div>
  )
}
