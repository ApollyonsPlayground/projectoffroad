'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HostRunWizard } from '@/components/runs/HostRunWizard';
import BottomNav from '@/components/BottomNav';

export default function CreateRunPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-zinc-900 safe-top">
        <div className="max-w-app-shell mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/runs"
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 touch-manipulation"
            aria-label="Back to runs"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-[18px] font-black text-white leading-tight">Create a run</h1>
            <p className="text-[12px] text-zinc-500">Same flow as &ldquo;Host a Run&rdquo; on the Runs tab</p>
          </div>
        </div>
      </header>
      <HostRunWizard
        variant="page"
        onSuccess={() => router.push('/runs')}
      />
      <BottomNav />
    </div>
  );
}
