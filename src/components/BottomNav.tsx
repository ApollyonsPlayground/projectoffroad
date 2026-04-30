'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Map, Calendar, Users, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/',          label: 'Home',     icon: Home,          requiresAuth: false },
  { href: '/trails',    label: 'Trails',   icon: Map,           requiresAuth: false },
  { href: '/runs',      label: 'Runs',     icon: Calendar,      requiresAuth: false },
  { href: '/messages',  label: 'Messages', icon: MessageCircle, requiresAuth: true  },
  { href: '/profile',   label: 'Profile',  icon: User,          requiresAuth: true  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, supabaseClient } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  // Check for unread messages and subscribe to changes
  useEffect(() => {
    if (!supabaseClient || !user) { setHasUnread(false); return; }

    const checkUnread = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('conversation_participants')
          .select('is_read')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .limit(1);
        // Gracefully handle missing table (404) or other errors
        if (error) {
          setHasUnread(false);
          return;
        }
        setHasUnread((data?.length ?? 0) > 0);
      } catch {
        setHasUnread(false);
      }
    };

    checkUnread();

    // Realtime: re-check when conversation_participants changes for this user
    const channel = supabaseClient
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        () => { checkUnread(); }
      )
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  }, [supabaseClient, user]);

  const triggerHaptic = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
  };

  const handleNav = async (href: string, requiresAuth: boolean) => {
    await triggerHaptic();
    if (requiresAuth && !user) {
      router.push('/login');
      return;
    }
    router.push(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-t border-zinc-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-row justify-around items-center pt-3 px-2 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, requiresAuth }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href));
          const showUnread = href === '/messages' && hasUnread && !!user;

          return (
            <button
              key={href}
              onClick={() => handleNav(href, requiresAuth)}
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
                {/* Unread notification dot */}
                {showUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-black z-20" />
                )}
              </motion.div>
              <span
                className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${
                  isActive ? 'text-orange-500' : 'text-zinc-500'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
