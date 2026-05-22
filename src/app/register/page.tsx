'use client'

import { useRouter } from 'next/navigation'
import { OAuthSignInButtons } from '@/components/auth/OAuthSignInButtons'

export default function RegisterPage() {
  const router = useRouter()

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

        <div className="w-full flex flex-col items-center gap-3">
          <OAuthSignInButtons mode="register" />
        </div>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Already have an account? Sign in
        </button>

      </div>
    </div>
  )
}
