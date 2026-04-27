'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Calendar, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trails', label: 'Trails', icon: Map },
  { href: '/runs', label: 'Runs', icon: Calendar },
  { href: '/clubs', label: 'Clubs', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Haptics not available
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-evenly px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={triggerHaptic}
              className="relative flex flex-col items-center justify-center py-2 px-4 min-w-[64px]"
            >
              <motion.div
                className="relative"
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -m-2 rounded-xl bg-orange-500/15"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  size={22}
                  className={`relative z-10 transition-colors ${
                    isActive ? 'text-orange-500' : 'text-zinc-500'
                  }`}
                />
              </motion.div>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive ? 'text-orange-500' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
