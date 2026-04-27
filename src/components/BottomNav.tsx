'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Calendar, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const NAV_ITEMS = [
  { href: '/',       label: 'Home',   icon: Home     },
  { href: '/trails', label: 'Trails', icon: Map      },
  { href: '/runs',   label: 'Runs',   icon: Calendar },
  { href: '/clubs',  label: 'Clubs',  icon: Users    },
  { href: '/profile',label: 'Profile',icon: User     },
];

export default function BottomNav() {
  const pathname = usePathname();

  const triggerHaptic = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
  };

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-t border-zinc-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-row justify-around items-center pt-3 px-2 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              onClick={triggerHaptic}
              aria-label={label}
              className="flex flex-col items-center gap-1 min-w-[48px] relative"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="relative flex items-center justify-center"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute -inset-2 rounded-xl bg-orange-500/15"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  size={23}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`relative z-10 transition-colors duration-150 ${
                    isActive ? 'text-orange-500' : 'text-zinc-500'
                  }`}
                />
              </motion.div>
              <span
                className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${
                  isActive ? 'text-orange-500' : 'text-zinc-500'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
