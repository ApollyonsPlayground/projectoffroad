'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { OAuthSignInButtons } from '@/components/auth/OAuthSignInButtons'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/feed/')
    }
  }, [loading, user, router])

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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-xs md:max-w-md flex flex-col items-center gap-10">

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/40">
            <span className="text-primary-foreground font-black text-[18px] tracking-tight">SO</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-black text-foreground text-[28px] tracking-tight leading-none">
              SoCal<span className="text-primary">Offroaders</span>
            </span>
          </div>
        </div>

        <OAuthSignInButtons mode="login" />

      </div>
    </div>
  )
}
