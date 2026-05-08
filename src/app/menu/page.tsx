'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Search,
  LayoutDashboard,
  Award,
  Trophy,
  BookOpen,
  Settings,
  Map,
  Calendar,
  Users,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';

type Item = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  auth?: boolean;
};

const ITEMS: Item[] = [
  { href: '/search/', label: 'Search', desc: 'Runs, clubs, riders', icon: Search },
  { href: '/dashboard/', label: 'Dashboard', desc: 'Stats & upcoming runs', icon: LayoutDashboard, auth: true },
  { href: '/achievements/', label: 'Achievements', desc: 'Badges & milestones', icon: Award, auth: true },
  { href: '/leaderboard/', label: 'Leaderboard', desc: 'Top participants', icon: Trophy },
  { href: '/guides/', label: 'Guides', desc: 'Beginner tips & truck buying', icon: BookOpen },
  { href: '/settings/', label: 'Settings', desc: 'Account & privacy', icon: Settings, auth: true },
  { href: '/trails/', label: 'Trail explorer', desc: 'Browse SoCal trails', icon: Map },
  { href: '/runs/', label: 'Runs', desc: 'Calendar & join runs', icon: Calendar },
  { href: '/clubs/', label: 'Clubs', desc: 'Find a crew', icon: Users },
  { href: '/messages/', label: 'Messages', desc: 'Direct messages', icon: MessageCircle, auth: true },
];

export default function MenuPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-foreground tracking-tight">More</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Search, guides, stats, and settings — everything beyond the main tabs.
        </p>
      </div>

      <ul className="max-w-lg mx-auto px-4 space-y-2">
        {ITEMS.map(({ href, label, desc, icon: Icon, auth }) => {
          const target = auth && !user ? `/login/?next=${encodeURIComponent(href)}` : href;
          const sub = auth && !user ? `${desc} · Sign in to open` : desc;
          return (
            <li key={href}>
              <Link
                href={target}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card/80 px-4 py-3.5 hover:border-primary/50 transition-colors"
              >
                <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
                  <Icon size={22} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground block">{label}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </span>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>

      <BottomNav />
    </div>
  );
}
