'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Map, Calendar, Users, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/context/AuthContext';

/** Skip DM unread polling when messaging tables are not deployed (avoids console 404 spam). */
const DM_UNAVAILABLE_KEY = 'socaloffroaders_dm_unavailable';

const NAV_ITEMS = [
  { href: '/feed/',      label: 'Home',      icon: Home,          requiresAuth: false },
  { href: '/trails/',    label: 'Trails',    icon: Map,           requiresAuth: false },
  { href: '/runs/',      label: 'Runs',      icon: Calendar,      requiresAuth: false },
  { href: '/clubs/',     label: 'Clubs',     icon: Users,         requiresAuth: false },
  { href: '/messages/',  label: 'Messages',  icon: MessageCircle, requiresAuth: true  },
  { href: '/profile/',   label: 'Profile',   icon: User,          requiresAuth: true  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, supabaseClient } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  // Check for unread messages and subscribe to changes
  useEffect(() => {
    if (!supabaseClient || !user) { setHasUnread(false); return; }

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DM_UNAVAILABLE_KEY) === '1') {
      setHasUnread(false);
      return;
    }

    const checkUnread = async () => {
      const { data, error } = await supabaseClient
        .from('conversation_participants')
        .select('is_read')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .limit(1);
      if (error) {
        setHasUnread(false);
        try {
          sessionStorage.setItem(DM_UNAVAILABLE_KEY, '1');
        } catch {
          /* ignore */
        }
        return false;
      }
      setHasUnread((data?.length ?? 0) > 0);
      return true;
    };

    let cancelled = false;
    let realtime: ReturnType<typeof supabaseClient.channel> | null = null;

    checkUnread().then((ok) => {
      if (!ok || cancelled) return;
      realtime = supabaseClient
        .channel('unread-badge')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
          () => {
            void checkUnread();
          }
        )
        .subscribe();
      if (cancelled && realtime) {
        supabaseClient.removeChannel(realtime);
        realtime = null;
      }
    });

    return () => {
      cancelled = true;
      if (realtime) {
        supabaseClient.removeChannel(realtime);
        realtime = null;
      }
    };
  }, [supabaseClient, user]);

  const triggerHaptic = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
  };

  const handleNav = (href: string, requiresAuth: boolean) => {
    // Never await native haptics — Capacitor/WebView can stall and block navigation.
    void triggerHaptic();
    if (requiresAuth && !user) {
      router.push('/login/');
      return;
    }
    router.push(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-[100] bg-background/90 backdrop-blur-md border-t border-border touch-manipulation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-row justify-around items-center pt-2.5 px-0.5 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, requiresAuth }) => {
          const pathNorm = (pathname.replace(/\/$/, '') || '/') as string;
          const hrefNorm = (href.replace(/\/$/, '') || '/') as string;
          const isActive =
            pathNorm === hrefNorm ||
            (hrefNorm !== '/' && pathNorm.startsWith(`${hrefNorm}/`));
          const showUnread = href === '/messages/' && hasUnread && !!user;

          return (
            <button
              type="button"
              key={href}
              onClick={() => handleNav(href, requiresAuth)}
              aria-label={label}
              className="flex flex-col items-center gap-0.5 min-w-[40px] sm:min-w-[48px] min-h-[48px] justify-center relative touch-manipulation active:opacity-90 flex-1 max-w-[72px]"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="relative flex items-center justify-center"
              >
                {/* Active indicator — avoid shared layoutId (Framer can leave invisible hit layers on Chrome/Android). */}
                {isActive && (
                  <div className="absolute -inset-2 rounded-xl bg-primary/15 pointer-events-none" aria-hidden />
                )}
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`relative z-10 transition-colors duration-150 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                {/* Unread notification dot */}
                {showUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background z-20" />
                )}
              </motion.div>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold leading-tight text-center transition-colors duration-150 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
