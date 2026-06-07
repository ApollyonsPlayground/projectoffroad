'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  DEV_UPDATES_VERSION,
  devUpdatesStorageKey,
  latestDevRelease,
  type DevUpdateTag,
} from '@/lib/devUpdates';

const TAG_LABEL: Record<DevUpdateTag, string> = {
  new: 'New',
  improved: 'Improved',
  fix: 'Fix',
};

const TAG_CLASS: Record<DevUpdateTag, string> = {
  new: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  improved: 'bg-primary/15 text-primary border-primary/30',
  fix: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export function DevUpdatesModal() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const release = latestDevRelease();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading || !user) return;
    try {
      const key = devUpdatesStorageKey(DEV_UPDATES_VERSION);
      if (localStorage.getItem(key) === '1') return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [mounted, loading, user]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const dismiss = () => {
    try {
      localStorage.setItem(devUpdatesStorageKey(DEV_UPDATES_VERSION), '1');
    } catch {
      /* private mode */
    }
    setOpen(false);
  };

  if (!mounted || !open) return null;

  const ui = (
    <div
      className="fixed inset-0 z-[19999] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-updates-title"
        className="w-full max-w-md max-h-[min(88dvh,640px)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-r from-primary/90 to-primary px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-foreground hover:bg-background/30"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="w-10 h-10 rounded-full bg-background/25 flex items-center justify-center">
              <Sparkles size={20} className="text-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground/70">
                What&apos;s new · {release.date}
              </p>
              <h2 id="dev-updates-title" className="text-lg font-black text-primary-foreground leading-tight">
                {release.title}
              </h2>
            </div>
          </div>
        </div>

        {release.callout ? (
          <div className="shrink-0 mx-5 mt-4 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 space-y-2">
            <p className="text-[12px] font-black uppercase tracking-wider text-primary">
              {release.callout.title}
            </p>
            <p className="text-[13px] text-foreground/90 leading-relaxed">{release.callout.body}</p>
            {release.callout.ctaHref && release.callout.ctaLabel ? (
              <Link
                href={release.callout.ctaHref}
                className="inline-flex text-[12px] font-bold text-primary hover:underline"
                onClick={dismiss}
              >
                {release.callout.ctaLabel} →
              </Link>
            ) : null}
          </div>
        ) : null}

        <ul className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {release.items.map((item) => (
            <li key={item.title} className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${TAG_CLASS[item.tag]}`}
                >
                  {TAG_LABEL[item.tag]}
                </span>
                <p className="text-[14px] font-bold text-foreground">{item.title}</p>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{item.summary}</p>
            </li>
          ))}
        </ul>

        <div className="shrink-0 px-5 pb-5 pt-2 border-t border-border space-y-2">
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3.5 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider touch-manipulation"
          >
            Got it — thanks
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            <Link href="/updates/" className="text-primary font-semibold hover:underline" onClick={dismiss}>
              View all updates
            </Link>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
