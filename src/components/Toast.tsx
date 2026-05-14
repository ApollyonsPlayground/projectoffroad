'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  // Return a no-op fallback so pages outside the provider never crash
  return ctx ?? { showToast: () => {} };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Portal-like toast stack above bottom nav */}
      <div
        className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastBubble key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={15} className="text-green-400 flex-shrink-0" />,
    error:   <AlertCircle size={15} className="text-red-400 flex-shrink-0" />,
    info:    <Info        size={15} className="text-primary/90 flex-shrink-0" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className="pointer-events-auto flex items-center gap-2.5 bg-card border border-border text-foreground text-[13px] font-medium px-4 py-3 rounded-2xl shadow-xl shadow-black/60 max-w-[320px]"
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground transition-colors ml-1">
        <X size={13} />
      </button>
    </motion.div>
  );
}
