'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut, isConfigured } = useAuth();
  const { showToast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/delete/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        showToast(data.error ?? 'Could not delete account', 'error');
        setSubmitting(false);
        return;
      }
      await signOut();
      showToast('Your account has been deleted', 'success');
      router.replace('/');
    } catch {
      showToast('Network error — try again or email support', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-app-shell mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/settings/"
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to settings"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-[16px] font-bold text-foreground">Delete account</h1>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto px-4 pt-6 space-y-6">
        {!isConfigured && (
          <p className="text-muted-foreground text-sm">App configuration error — cannot reach authentication.</p>
        )}

        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-4 flex gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={22} aria-hidden />
          <div className="text-[13px] text-red-100/95 leading-relaxed space-y-2">
            <p className="font-bold text-foreground">This is permanent</p>
            <p className="text-red-100/85">
              We remove your login and delete data tied to your account where our database is set up to cascade,
              including your profile, saved trails, vehicles you added, posts you authored, comments, likes, follows,
              and direct messages — consistent with how our tables reference your user id.
            </p>
            <p className="text-red-100/85">
              Short-lived backups or provider logs may take up to a few weeks to expire (see our privacy policy).
              Content you contributed that others quoted or that was aggregated anonymously may remain in derived stats.
            </p>
          </div>
        </div>

        {authLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : !user ? (
          <div className="space-y-4 text-[14px] text-muted-foreground leading-relaxed">
            <p>
              Sign in first, then return here to delete your account in one step. You can also email{' '}
              <a className="text-primary/90 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
                {SITE_SUPPORT_EMAIL}
              </a>{' '}
              from the address on your account and ask us to delete it — include “Delete my account” in the subject.
            </p>
            <Link
              href={`/login/?next=${encodeURIComponent('/account/delete/')}`}
              className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-[15px] transition-colors"
            >
              Sign in to continue
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground">
              Signed in as <span className="text-muted-foreground">{user.email ?? user.id}</span>
            </p>

            <label className="flex items-start gap-3 cursor-pointer text-[14px] text-muted-foreground leading-snug">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 accent-primary rounded border-border shrink-0"
              />
              <span>I understand this permanently deletes my account and associated personal data as described above.</span>
            </label>

            <button
              type="button"
              disabled={!confirmed || submitting}
              onClick={() => void handleDelete()}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-bold text-[15px] transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete my account permanently'
              )}
            </button>
          </>
        )}

        <p className="text-[12px] text-muted-foreground pt-2">
          Questions?{' '}
          <a className="text-primary/90 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
            {SITE_SUPPORT_EMAIL}
          </a>{' '}
          ·{' '}
          <Link href="/privacy/" className="text-primary/90 hover:underline">
            Privacy policy
          </Link>
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
