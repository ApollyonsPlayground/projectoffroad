'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, Loader2, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import { useToast } from '@/components/Toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  media_type: string | null;
  media_path: string | null;
}

interface OtherUser {
  id: string;
  name: string | null;
  avatar_url: string | null;
  username?: string | null;
  hide_display_name?: boolean | null;
  email?: string | null;
}

function dmPreviewLine(content: string | null | undefined, mediaType: string | null | undefined) {
  const t = (content ?? '').trim();
  if (t) return t;
  if (mediaType === 'video') return '🎬 Video';
  if (mediaType === 'image') return '📷 Photo';
  return 'Message';
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : params.conversationId?.[0];
  const router = useRouter();
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [dmSignedUrls, setDmSignedUrls] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const dmMediaFetchedRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const bumpConversationMeta = useCallback(
    async (preview: string) => {
      if (!supabaseClient || !user || !conversationId) return;
      await supabaseClient
        .from('conversations')
        .update({
          last_message_content: preview,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
      await supabaseClient
        .from('conversation_participants')
        .update({ is_read: false })
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);
    },
    [supabaseClient, user, conversationId]
  );

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !user || !conversationId) return;

    const [messagesRes, participantsRes] = await Promise.all([
      supabaseClient
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
      supabaseClient
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id),
    ]);

    const rows = (messagesRes.data ?? []) as Message[];
    setMessages(rows);

    const otherUserId = participantsRes.data?.[0]?.user_id;
    if (otherUserId) {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id, name, avatar_url, username, hide_display_name, email')
        .eq('id', otherUserId)
        .single();
      setOtherUser(userData as OtherUser ?? null);
    }

    setIsLoading(false);

    await supabaseClient
      .from('conversation_participants')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  }, [supabaseClient, user, conversationId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!supabaseClient) return;
    for (const m of messages) {
      if (!m.media_path || dmMediaFetchedRef.current.has(m.id)) continue;
      dmMediaFetchedRef.current.add(m.id);
      void supabaseClient.storage
        .from('dm-media')
        .createSignedUrl(m.media_path, 60 * 60 * 24 * 7)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setDmSignedUrls((prev) => ({ ...prev, [m.id]: data.signedUrl }));
          }
        });
    }
  }, [messages, supabaseClient]);

  useEffect(() => {
    if (!supabaseClient || !conversationId || !user) return;

    const channel = supabaseClient
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== user.id) {
            supabaseClient
              .from('conversation_participants')
              .update({ is_read: true })
              .eq('conversation_id', conversationId)
              .eq('user_id', user.id);
          }
          setTimeout(() => scrollToBottom(), 80);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, conversationId, user, scrollToBottom]);

  const handleMediaFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !supabaseClient || !user || !conversationId || uploadingMedia || sending) return;

    const mime = file.type || '';
    let mediaType: 'image' | 'video' | null = null;
    if (mime.startsWith('image/')) mediaType = 'image';
    else if (mime.startsWith('video/')) mediaType = 'video';
    if (!mediaType) {
      showToast('Send a photo or video.', 'info');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('File too large (max 50 MB).', 'error');
      return;
    }

    const caption = text.trim();
    const ext = (file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg')).toLowerCase().slice(0, 8);
    const path = `${conversationId}/${user.id}/${crypto.randomUUID()}.${ext}`;

    setUploadingMedia(true);
    try {
      const { error: upErr } = await supabaseClient.storage.from('dm-media').upload(path, file, {
        contentType: mime || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: inserted, error: msgError } = await supabaseClient
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: caption,
          media_type: mediaType,
          media_path: path,
          is_read: false,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      setMessages((prev) => [...prev, inserted as Message]);
      setText('');
      await bumpConversationMeta(dmPreviewLine(caption, mediaType));
      setTimeout(() => scrollToBottom(), 60);
      inputRef.current?.focus();
    } catch {
      showToast('Could not send attachment.', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !supabaseClient || !user || !conversationId || sending) return;

    setSending(true);
    setText('');

    const optimisticId = crypto.randomUUID();
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      media_type: null,
      media_path: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 60);

    try {
      const { data: inserted, error: msgError } = await supabaseClient
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          is_read: false,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? (inserted as Message) : m)));

      await bumpConversationMeta(dmPreviewLine(content, null));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach((m) => {
    const date = new Date(m.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.messages.push(m);
    } else {
      grouped.push({ date, messages: [m] });
    }
  });

  function formatDateDivider(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  if (isLoading || !conversationId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  const otherDisplayName = otherUser
    ? resolvePublicDisplayName({
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username ?? null,
        hide_display_name: otherUser.hide_display_name ?? null,
        email: otherUser.email ?? null,
      })
    : 'Rider';

  return (
    <div className="flex flex-col h-[100dvh] bg-black">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-black/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.push('/messages/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors"
          aria-label="Back to messages"
        >
          <ArrowLeft size={19} className="text-white" />
        </button>

        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.name ?? 'Rider'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={16} className="text-zinc-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-white leading-none truncate">{otherDisplayName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center">
              <User size={24} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-[13px]">
              Say hi to {otherUser ? otherDisplayName : 'this rider'}
            </p>
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-zinc-900" />
                  <span className="text-[11px] text-zinc-600 font-medium">{formatDateDivider(group.date)}</span>
                  <div className="flex-1 h-px bg-zinc-900" />
                </div>

                <div className="space-y-1">
                  {group.messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    const prevMsg = group.messages[idx - 1];
                    const isSameAuthor = prevMsg?.sender_id === msg.sender_id;
                    const showTime =
                      !isSameAuthor ||
                      new Date(msg.created_at).getTime() - new Date(prevMsg?.created_at ?? 0).getTime() >
                        5 * 60 * 1000;
                    const hasMedia = Boolean(msg.media_path && msg.media_type);
                    const hasText = (msg.content ?? '').trim().length > 0;

                    return (
                      <AnimatePresence key={msg.id} initial={false}>
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${!isSameAuthor ? 'mt-3' : 'mt-0.5'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl overflow-hidden ${
                              isMe
                                ? 'bg-orange-500 text-black rounded-br-md'
                                : 'bg-zinc-900 text-white rounded-bl-md border border-zinc-800'
                            }`}
                          >
                            {hasMedia && !dmSignedUrls[msg.id] && (
                              <div className="flex items-center justify-center py-10 px-14">
                                <Loader2 size={22} className="animate-spin text-zinc-400" />
                              </div>
                            )}
                            {hasMedia && msg.media_type === 'image' && dmSignedUrls[msg.id] && (
                              <img
                                src={dmSignedUrls[msg.id]}
                                alt=""
                                className="max-h-72 w-full object-cover bg-black"
                              />
                            )}
                            {hasMedia && msg.media_type === 'video' && dmSignedUrls[msg.id] && (
                              <video
                                src={dmSignedUrls[msg.id]}
                                controls
                                playsInline
                                className="max-h-72 w-full bg-black"
                              />
                            )}
                            {hasText && (
                              <div
                                className={`px-4 py-2.5 text-[14px] leading-relaxed break-words ${
                                  isMe ? 'font-medium text-black' : 'text-white'
                                }`}
                              >
                                {msg.content}
                              </div>
                            )}
                          </div>
                          {showTime && (
                            <span className="text-[10px] text-zinc-600 mt-1 px-1">{timeLabel(msg.created_at)}</span>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} className="h-1" />
          </>
        )}
      </div>

      <div
        className="flex-shrink-0 border-t border-zinc-900 bg-black px-3 py-3 flex items-end gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            void handleMediaFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => mediaInputRef.current?.click()}
          disabled={uploadingMedia || sending}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-orange-400 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          aria-label="Attach photo or video"
        >
          {uploadingMedia ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} strokeWidth={2.2} />}
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-[14px] text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-orange-500/60 transition-colors leading-relaxed overflow-hidden"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black transition-colors"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin text-zinc-600" />
          ) : (
            <Send size={16} strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
