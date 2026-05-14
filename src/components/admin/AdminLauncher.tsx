'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminPanel } from '@/components/admin/AdminPanel';

/** Paths where the floating admin entry is hidden */
const HIDE_PATH = /^\/(login|register)(\/|$)/;

function hideFloatingAdmin(pathname: string | null): boolean {
  if (!pathname) return true;
  if (HIDE_PATH.test(pathname)) return true;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return false;
}

export function AdminLauncher() {
  const pathname = usePathname();
  const { user, supabaseClient } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !supabaseClient) {
      setRole(null);
      return;
    }
    supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const r = String((data as { role?: string } | null)?.role ?? '').trim().toLowerCase();
        setRole(r || null);
      });
  }, [user, supabaseClient]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener('open-admin-panel', openPanel);
    return () => window.removeEventListener('open-admin-panel', openPanel);
  }, []);

  const allowed =
    role === 'owner' || role === 'admin';
  if (!allowed || !user || hideFloatingAdmin(pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(7.25rem+env(safe-area-inset-bottom))] md:bottom-8 left-4 z-[9980] flex items-center gap-2 pl-4 pr-3.5 py-3 rounded-full bg-card/95 border border-primary/45 text-primary/90 text-[11px] font-black uppercase tracking-wide shadow-lg shadow-black/60 backdrop-blur-sm touch-manipulation min-h-[48px]"
        aria-label="Open admin tools"
      >
        <Shield size={18} strokeWidth={2.2} />
        Admin
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              role="presentation"
              className="fixed inset-0 z-[9989] bg-background/75 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Admin tools"
              className="fixed bottom-0 left-0 right-0 z-[9990] max-w-lg mx-auto max-h-[min(92dvh,800px)] flex flex-col bg-background border border-border border-b-0 rounded-t-2xl overflow-hidden shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 pt-2 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
                <AdminPanel variant="drawer" onCloseDrawer={() => setOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
