'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'socal-caelum-chat-v1';
const CHAT_MAX_LEN = 4000;

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Row id from caelum_chat_queue — attached after enqueue */
  queueId?: string;
  /** Reply tied to this queue row */
  linkedQueueId?: string;
};

type StoredChat = {
  v: 1 | 2;
  messages: ChatMessage[];
  updatedAt: string;
};

const HIDE_PATH = /^\/(login|register|auth)(\/|$)/;

function hideWidget(pathname: string | null): boolean {
  if (!pathname) return true;
  if (HIDE_PATH.test(pathname)) return true;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return false;
}

function playReplyChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 740;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const stop = () => {
      try {
        osc.stop();
        void ctx.close();
      } catch {
        /* ignore */
      }
    };
    window.setTimeout(stop, 140);
  } catch {
    /* ignore */
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function CaelumChatWidget() {
  const pathname = usePathname();
  const { user, profile, supabaseClient } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const watchersRef = useRef<Map<string, () => void>>(new Map());
  const pendingCountRef = useRef(0);
  const finalizedQueuesRef = useRef<Set<string>>(new Set());
  const ctxRef = useRef({ user, supabaseClient });

  useEffect(() => {
    ctxRef.current = { user, supabaseClient };
  });

  const displayName = useMemo(() => {
    const p = profile as { name?: string } | null;
    const n = typeof p?.name === 'string' ? p.name.trim() : '';
    if (n) return n;
    return undefined;
  }, [profile]);

  function reconcileTypingFromMessages(next: ChatMessage[]) {
    const pendingQueues = new Set<string>();
    for (const m of next) {
      if (m.role !== 'user' || !m.queueId) continue;
      const answered = next.some((x) => x.role === 'assistant' && x.linkedQueueId === m.queueId);
      if (!answered) pendingQueues.add(m.queueId);
    }
    pendingCountRef.current = pendingQueues.size;
    setTyping(pendingQueues.size > 0);
  }

  function finalizeReply(queueId: string, text: string) {
    if (finalizedQueuesRef.current.has(queueId)) return;
    finalizedQueuesRef.current.add(queueId);

    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
    if (pendingCountRef.current <= 0) setTyping(false);

    playReplyChime();

    setMessages((prev) => {
      if (prev.some((x) => x.role === 'assistant' && x.linkedQueueId === queueId)) return prev;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          createdAt: new Date().toISOString(),
          linkedQueueId: queueId,
        },
      ];
    });

    const cleanup = watchersRef.current.get(queueId);
    cleanup?.();
    watchersRef.current.delete(queueId);
  }

  function ensureWatching(queueId: string) {
    if (watchersRef.current.has(queueId)) return;

    const { user: u, supabaseClient: sb } = ctxRef.current;

    if (u?.id && sb) {
      const channel = sb
        .channel(`caelum:${queueId}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'caelum_chat_queue',
            filter: `id=eq.${queueId}`,
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const row = payload.new as { status?: string; reply?: string | null };
            if (row.status === 'done' && typeof row.reply === 'string' && row.reply.trim()) {
              finalizeReply(queueId, row.reply.trim());
            } else if (row.status === 'failed') {
              finalizeReply(
                queueId,
                typeof row.reply === 'string' && row.reply.trim()
                  ? row.reply.trim()
                  : 'Couldn’t finish that request. Try again shortly.',
              );
            }
          },
        )
        .subscribe();

      watchersRef.current.set(queueId, () => {
        void sb.removeChannel(channel);
      });
      return;
    }

    const iv = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/caelum/chat?id=${encodeURIComponent(queueId)}`);
        const j = await parseJsonSafe<{ status?: string; reply?: string | null }>(r);
        if (!r.ok || !j) return;

        if (j.status === 'done' && typeof j.reply === 'string' && j.reply.trim()) {
          finalizeReply(queueId, j.reply.trim());
        } else if (j.status === 'failed') {
          finalizeReply(
            queueId,
            typeof j.reply === 'string' && j.reply.trim() ? j.reply.trim() : 'Could not complete request.',
          );
        }
      } catch {
        /* ignore */
      }
    }, 2500);

    watchersRef.current.set(queueId, () => window.clearInterval(iv));
  }

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as StoredChat;
        if (parsed?.v === 1 || parsed?.v === 2) {
          if (Array.isArray(parsed.messages)) {
            const cleaned = parsed.messages
              .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
              .map((m) => ({
                id: typeof m.id === 'string' ? m.id : crypto.randomUUID(),
                role: m.role,
                content: m.content.slice(0, CHAT_MAX_LEN),
                createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
                queueId: typeof m.queueId === 'string' ? m.queueId : undefined,
                linkedQueueId: typeof m.linkedQueueId === 'string' ? m.linkedQueueId : undefined,
              }));
            setMessages(cleaned);
            reconcileTypingFromMessages(cleaned);
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    for (const m of messages) {
      if (m.role !== 'user' || !m.queueId) continue;
      const answered = messages.some((x) => x.role === 'assistant' && x.linkedQueueId === m.queueId);
      if (!answered) ensureWatching(m.queueId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureWatching guarded by watchersRef
  }, [hydrated, messages, user?.id, supabaseClient]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: StoredChat = {
        v: 2,
        messages: messages.slice(-80),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    const ref = watchersRef;
    return () => {
      ref.current.forEach((fn) => fn());
      ref.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, typing]);

  async function sendInternal(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed.slice(0, CHAT_MAX_LEN),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    let token: string | null = null;
    if (supabaseClient) {
      const { data } = await supabaseClient.auth.getSession();
      token = data.session?.access_token ?? null;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/caelum/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed.slice(0, CHAT_MAX_LEN),
          context: {
            currentPage: pathname ?? '/',
            userId: user?.id,
            userName: displayName,
          },
        }),
      });

      const j = await parseJsonSafe<{ success?: boolean; id?: string; error?: string }>(res);

      if (!res.ok || !j?.success || !j.id) {
        const errText = j?.error ?? `Something went wrong (${res.status})`;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: errText,
            createdAt: new Date().toISOString(),
          },
        ]);
        setTyping(false);
        return;
      }

      const queueId = j.id;
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, queueId } : m)),
      );

      pendingCountRef.current += 1;
      setTyping(true);
      ensureWatching(queueId);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Network hiccup — check your connection and try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
      setTyping(false);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendInternal(input);
  }

  function quickSend(q: string) {
    void sendInternal(q);
  }

  if (!hydrated || hideWidget(pathname)) {
    return null;
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[9975] flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/50 bg-gradient-to-br from-zinc-900 to-black text-orange-400 shadow-lg shadow-black/50 backdrop-blur-sm touch-manipulation min-h-[56px] min-w-[56px]"
          aria-label="Ask Caelum"
        >
          <Sparkles size={26} strokeWidth={2} className="drop-shadow-[0_0_8px_rgba(251,146,60,0.35)]" />
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-black" title="Online" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              role="presentation"
              className="fixed inset-0 z-[9985] bg-black/70 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Ask Caelum chat"
              className="fixed bottom-0 left-0 right-0 z-[9986] mx-auto flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-800 border-b-0 bg-zinc-950 shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 440, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                    <Sparkles size={20} />
                    <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">Ask Caelum</p>
                    <p className="truncate text-[11px] text-emerald-400/90">Online · trails, runs & clubs</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Minimize chat"
                  >
                    <ChevronDown size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close chat"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
                {messages.length === 0 && (
                  <p className="text-[13px] leading-relaxed text-zinc-500">
                    Hey! I’m Caelum — ask me anything about Southern California trails, upcoming runs, clubs, or how the app works.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${
                        m.role === 'user'
                          ? 'bg-orange-500 text-black font-medium rounded-br-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-md'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="flex gap-1 rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900 px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-zinc-800 px-4 pb-3 pt-2 space-y-2 bg-black/40">
                <div className="flex flex-wrap gap-2">
                  {(['Find a trail near me', 'Join a club', 'Next run coming up?'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={sending}
                      onClick={() => quickSend(q)}
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-orange-500/40 hover:text-white disabled:opacity-40 touch-manipulation"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <form onSubmit={onSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about trails, runs, clubs…"
                    maxLength={CHAT_MAX_LEN}
                    disabled={sending}
                    className="min-h-[48px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 text-[14px] text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-40 touch-manipulation"
                    aria-label="Send message"
                  >
                    <Send size={20} />
                  </button>
                </form>
                <p className="text-center text-[10px] text-zinc-600">
                  Powered by <span className="text-zinc-500 font-semibold">Caelum</span>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
