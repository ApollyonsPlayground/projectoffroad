import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guides | SoCalOffroaders',
  description: 'Beginner off-road guides and truck buying tips for Southern California.',
};

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-app-menu mx-auto px-5 py-8">
        <Link
          href="/settings/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-400 mb-8"
        >
          <ArrowLeft size={16} />
          Settings
        </Link>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">Guides</h1>
        <p className="text-zinc-500 text-[15px] mb-8 leading-relaxed">
          Practical references for riding in SoCal — no fluff.
        </p>

        <ul className="space-y-3">
          <li>
            <Link
              href="/guides/beginner/"
              className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-orange-500/50 transition-colors"
            >
              <span className="mt-0.5 rounded-xl bg-orange-500/15 p-2 text-orange-400">
                <BookOpen size={22} />
              </span>
              <span>
                <span className="font-bold text-white block">Beginner&apos;s guide</span>
                <span className="text-zinc-500 text-sm mt-1 block leading-snug">
                  Prep, recovery basics, etiquette, and easy terrain.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/guides/truck-buying/"
              className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-orange-500/50 transition-colors"
            >
              <span className="mt-0.5 rounded-xl bg-orange-500/15 p-2 text-orange-400">
                <Truck size={22} />
              </span>
              <span>
                <span className="font-bold text-white block">Truck &amp; SUV buying</span>
                <span className="text-zinc-500 text-sm mt-1 block leading-snug">
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
