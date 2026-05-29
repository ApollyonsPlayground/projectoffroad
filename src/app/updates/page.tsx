'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { DEV_UPDATES, type DevUpdateTag } from '@/lib/devUpdates';

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

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="max-w-app-shell mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/menu/"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-card text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="text-primary shrink-0" />
            <h1 className="text-[17px] font-black text-foreground truncate">What&apos;s new</h1>
          </div>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto px-4 py-6 space-y-8">
        {DEV_UPDATES.map((release) => (
          <section key={release.version} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-4 border-b border-border bg-muted/40">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{release.date}</p>
              <h2 className="text-lg font-black text-foreground mt-1">{release.title}</h2>
            </div>
            <ul className="divide-y divide-border">
              {release.items.map((item) => (
                <li key={item.title} className="px-4 py-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${TAG_CLASS[item.tag]}`}
                    >
                      {TAG_LABEL[item.tag]}
                    </span>
                    <p className="text-[15px] font-bold text-foreground">{item.title}</p>
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{item.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
