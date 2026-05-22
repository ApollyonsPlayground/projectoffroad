'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { AppleSignInButton } from '@/components/auth/AppleSignInButton'
import { showAppleSignIn } from '@/utils/auth/showAppleSignIn'
import { isIosNative } from '@/utils/capacitator/isIosNative'

export default function RegisterPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [appleVisible, setAppleVisible] = useState(false)
  const { signInWithGoogle, signInWithApple } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setAppleVisible(showAppleSignIn())
  }, [])

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      showToast(err, 'error')
      setGoogleLoading(false)
    }
  }

  async function handleApple() {
    setAppleLoading(true)
    const { error: err } = await signInWithApple()
    if (err) {
      showToast(err, 'error')
      setAppleLoading(false)
      return
    }
    if (isIosNative()) {
      window.location.assign('/feed/')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-xs md:max-w-md flex flex-col items-center gap-10">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/40">
            <span className="text-primary-foreground font-black text-[18px] tracking-tight">SO</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-black text-foreground text-[28px] tracking-tight leading-none">
              SoCal<span className="text-primary">Offroaders</span>
            </span>
            <p className="text-muted-foreground text-[13px] text-center leading-snug max-w-[240px]">
              {appleVisible
                ? 'Create an account with Google or Apple.'
                : 'Create an account with Google.'}
            </p>
          </div>
        </div>

        {/* OAuth */}
        <div className="w-full flex flex-col items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.015 }}
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading}
            className="w-full flex items-center justify-center gap-3.5 py-5 rounded-2xl border-2 border-[#FF8C00] bg-card text-foreground font-bold text-[17px] hover:bg-[#FF8C00]/8 transition-colors shadow-lg shadow-[#FF8C00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign up with Google"
          >
            {googleLoading ? (
              <Loader2 size={22} className="animate-spin text-[#FF8C00]" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>

          {appleVisible ? (
            <AppleSignInButton
              loading={appleLoading}
              disabled={googleLoading}
              label="Continue with Apple"
              loadingLabel="Signing in…"
              onClick={handleApple}
            />
          ) : null}

          <p className="text-[11px] text-muted-foreground text-center max-w-[240px] leading-relaxed">
            By continuing you agree to our community guidelines.
          </p>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Already have an account? Sign in
        </button>

      </div>
    </div>
  )
}
