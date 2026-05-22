'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, ArrowLeft, User, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';

interface OtherParticipant {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  last_message_content: string | null;
  last_message_at: string | null;
  other_participant: OtherParticipant;
  unread: boolean;
}

type ParticipantRow = { conversation_id: string; is_read?: boolean | null };
type ConvMetaRow = { id: string; last_message_content?: string | null; last_message_at?: string | null };
type OtherParticipantRow = { conversation_id: string; user_id: string };
type MessagesUserRow = {
  id: string;
  name?: string | null;
  username?: string | null;
  hide_display_name?: boolean | null;
  email?: string | null;
  avatar_url?: string | null;
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!supabaseClient || !user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Get all conversations this user participates in
      const { data: participantRows, error: pErr } = await supabaseClient
        .from('conversation_participants')
        .select('conversation_id, is_read')
        .eq('user_id', user.id);

      if (pErr || !participantRows?.length) {
        setConversations([]);
        return;
      }

      const pr = participantRows as ParticipantRow[];
      const conversationIds = pr.map((r) => r.conversation_id);
      const isReadMap: Record<string, boolean> = {};
      pr.forEach((r) => {
        isReadMap[r.conversation_id] = r.is_read ?? true;
      });

      // Get conversation metadata
      const { data: convRows, error: cErr } = await supabaseClient
        .from('conversations')
        .select('id, last_message_content, last_message_at')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (cErr || !convRows?.length) {
        setConversations([]);
        return;
      }

      // For each conversation, find the OTHER participant's user_id
      const { data: allParticipants } = await supabaseClient
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id);

      // Collect distinct other user IDs
      const otherUserIds = [
        ...new Set(((allParticipants ?? []) as OtherParticipantRow[]).map((r) => r.user_id)),
      ];
      const otherUserMap: Record<string, MessagesUserRow> = {};

      if (otherUserIds.length > 0) {
        const { data: userRows } = await supabaseClient
          .from('users')
          .select('id, name, avatar_url, username, hide_display_name, email')
          .in('id', otherUserIds);
        ((userRows ?? []) as MessagesUserRow[]).forEach((u) => {
          otherUserMap[u.id] = u;
        });
      }

      // Map other participant per conversation
      const participantByConv: Record<string, string> = {};
      ((allParticipants ?? []) as OtherParticipantRow[]).forEach((r) => {
        participantByConv[r.conversation_id] = r.user_id;
      });

      const result: Conversation[] = (convRows as ConvMetaRow[]).map((c) => {
        const otherUserId = participantByConv[c.id] ?? '';
        const otherUser = otherUserMap[otherUserId] ?? null;
        return {
          id: c.id,
          last_message_content: c.last_message_content ?? null,
          last_message_at: c.last_message_at ?? null,
          other_participant: {
            id: otherUserId,
            display_name: resolvePublicDisplayName({
              id: otherUserId,
              name: otherUser?.name ?? null,
              username: otherUser?.username ?? null,
              hide_display_name: otherUser?.hide_display_name ?? null,
              email: otherUser?.email ?? null,
            }),
            avatar_url: otherUser?.avatar_url ?? null,
          },
          unread: !(isReadMap[c.id] ?? true),
        };
      });

      setConversations(result);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, user]);

  useEffect(() => {
    if (!authLoading) fetchConversations();
  }, [authLoading, fetchConversations]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login/');
  }, [authLoading, user, router]);

  const filtered = conversations.filter((c) =>
    search === '' ||
    (c.other_participant.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.last_message_content ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-safe-nav">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-card transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={19} className="text-foreground" />
          </button>
          <h1 className="text-[17px] font-black text-foreground leading-none flex-1">Messages</h1>
          <div className="w-2 h-2" />
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-app-shell mx-auto">
        {isLoading ? (
          <div className="flex flex-col gap-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-card animate-pulse flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 bg-card rounded-md animate-pulse w-28" />
                  <div className="h-3 bg-card rounded-md animate-pulse w-44" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <MessageCircle size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-[18px] font-black text-foreground">
              {search ? 'No matches' : 'No messages yet'}
            </h2>
            <p className="text-muted-foreground text-[13px] leading-relaxed max-w-[220px]">
              {search
                ? 'Try a different name or message.'
                : 'Visit a rider\'s profile and tap Message to start a conversation.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-card/40 transition-colors active:bg-card/60"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-border">
                      {conv.other_participant.avatar_url ? (
                        <img
                          src={conv.other_participant.avatar_url}
                          alt={conv.other_participant.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={20} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Unread dot */}
                    {conv.unread && (
                      <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-black" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[14px] leading-none ${conv.unread ? 'font-black text-foreground' : 'font-semibold text-foreground'}`}>
                        {conv.other_participant.display_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={`text-[13px] leading-snug mt-1 truncate ${conv.unread ? 'text-muted-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.last_message_content ?? 'Start a conversation'}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
