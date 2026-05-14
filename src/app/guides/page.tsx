import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guides | SoCalOffroaders',
  description: 'Beginner off-road guides and truck buying tips for Southern California.',
};

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-muted text-foreground">
      <div className="max-w-app-menu mx-auto px-5 py-8">
        <Link
          href="/settings/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary/90 mb-8"
        >
          <ArrowLeft size={16} />
          Settings
        </Link>

        <h1 className="text-2xl font-black text-foreground tracking-tight mb-2">Guides</h1>
        <p className="text-muted-foreground text-[15px] mb-8 leading-relaxed">
          Practical references for riding in SoCal — no fluff.
        </p>

        <ul className="space-y-3">
          <li>
            <Link
              href="/guides/beginner/"
              className="flex items-start gap-4 rounded-2xl border border-border bg-card/80 p-4 hover:border-primary/50 transition-colors"
            >
              <span className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary/90">
                <BookOpen size={22} />
              </span>
              <span>
                <span className="font-bold text-foreground block">Beginner&apos;s guide</span>
                <span className="text-muted-foreground text-sm mt-1 block leading-snug">
                  Prep, recovery basics, etiquette, and easy terrain.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/guides/truck-buying/"
              className="flex items-start gap-4 rounded-2xl border border-border bg-card/80 p-4 hover:border-primary/50 transition-colors"
            >
              <span className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary/90">
                <Truck size={22} />
              </span>
              <span>
                <span className="font-bold text-foreground block">Truck &amp; SUV buying</span>
                <span className="text-muted-foreground text-sm mt-1 block leading-snug">
                  What to look for in a trail rig, new vs used, and first mods.
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
