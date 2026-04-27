'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, LogIn, AlertCircle, Chrome } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
      setLoading(false)
    } else {
      showToast('Welcome back!', 'success')
      router.push('/')
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      showToast(err, 'error')
      setGoogleLoading(false)
    }
    // On success, Supabase redirects the browser — no need to navigate manually
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Wordmark */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
              <span className="text-black font-black text-[13px] tracking-tight">PO</span>
            </div>
            <span className="font-black text-white text-2xl tracking-tight">
              Project<span className="text-orange-500">Offroad</span>
            </span>
          </div>
          <p className="text-zinc-500 text-[14px]">Sign in to the community</p>
        </div>

        {/* ── Google button (hero CTA) ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-orange-500 bg-black text-white font-bold text-[17px] hover:bg-orange-500/8 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 size={22} className="animate-spin text-orange-500" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[12px] text-zinc-600 font-medium">or sign in with email</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Email / password form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6"
        >
          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] p-3 rounded-xl mb-4">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500/60 rounded-xl px-3 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500/60 rounded-xl px-3 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-[14px] rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-zinc-600 text-[13px]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-orange-500 hover:text-orange-400 transition-colors font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
