'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'

export default function RegisterPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signInWithGoogle } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      showToast(err, 'error')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-xs md:max-w-md flex flex-col items-center gap-10">

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
              Create an account with Google. Apple sign-in is coming soon.
            </p>
          </div>
        </div>

        {/* OAuth */}
        <div className="w-full flex flex-col items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.015 }}
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3.5 py-5 rounded-2xl border-2 border-[#FF8C00] bg-black text-white font-bold text-[17px] hover:bg-[#FF8C00]/8 transition-colors shadow-lg shadow-[#FF8C00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div
            className="w-full flex flex-col items-center justify-center gap-1 py-4 rounded-2xl border-2 border-zinc-700 bg-zinc-900/60 text-zinc-500"
            role="status"
            aria-label="Sign up with Apple — coming soon"
          >
            <span className="flex items-center gap-2.5 font-bold text-[15px] text-zinc-400">
              <svg width="18" height="22" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 138.3 204.5-1.5 3.2-21.6 73.7-71.3 145.4-44.2 63.5-90.1 126.9-162.1 127.8-71.1 1-94.1-42.1-175.3-42.1-81.2 0-106.6 41-173.9 43.5-69.5 2.6-122.5-69.5-166.7-133-90.8-131.8-160.5-372.3-67.1-534.2 45.7-79.2 127.4-129.4 216.3-130.8 67.4-1.3 131 45.3 171.3 45.3 40.2 0 115.9-56.9 195.5-48.4 33.3 1.4 126.6 13.4 186.5 100.4-4.8 3-111.3 65.1-111.3 194.2 0 153.8 120.1 207.6 126.3 210.9zM468.7 132.7c35.9-43.1 60.1-102.8 53.4-162.6-51.6 2.1-114.1 34.4-151.2 77.4-33.2 38.1-62.4 99.1-54.6 157.6 57.5 4.5 116.2-29.2 152.4-72.4z" />
              </svg>
              Apple — coming soon
            </span>
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Finishing setup</span>
          </div>

          <p className="text-[11px] text-zinc-700 text-center max-w-[240px] leading-relaxed">
            By continuing with Google you agree to our community guidelines.
          </p>        </div>

        <button
          onClick={() => router.push('/login')}
          className="text-[13px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Already have an account? Sign in
        </button>

      </div>
    </div>
  )
}
