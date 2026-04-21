'use client';

import Link from 'next/link';
import { Home, Map, Users, User, Settings, Compass } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/runs', label: 'Runs', icon: Compass },
  { href: '/clubs', label: 'Clubs', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function LeftNav() {
  return (
    <nav className="sticky top-0 w-64 h-screen bg-neutral-900 border-r-2 border-neutral-800 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-black uppercase tracking-widest text-orange-500">
          SoCal<span className="text-white">Offroad</span>
        </h1>
      </div>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-orange-500 hover:bg-neutral-800 rounded-none transition-colors font-bold uppercase text-sm tracking-wide border-l-4 border-transparent hover:border-orange-500"
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-8 border-t-2 border-neutral-800">
        <Link
          href="/runs/create"
          className="block w-full py-3 bg-orange-600 hover:bg-orange-700 text-center font-black uppercase tracking-wider text-white"
        >
          + New Run
        </Link>
      </div>
    </nav>
  );
}