'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Send, Image as ImageIcon, X, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { isLimitedMediaDevice, resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';

type ClubMessageRow = {
  id: string;
  club_id: string;
  user_id: string;
  content: string;
  media_type?: string | null;
  media_bucket?: string | null;
  media_path?: string | null;
  created_at: string;
};

type UserRow = { id: string; name: string | null; avatar_url: string | null };

export default function ClubChatPage() {
  const params = useParams();
  const clubId = useMemo(() => {
    const raw = params?.id;
    const s = Array.isArray(raw) ? raw[0] : raw;
    return typeof s === 'string' ? s.trim().replace(/\/+$/, '') : '';
  }, [params?.id]);
  const router = useRouter();
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [messages, setMessages] = useState<(ClubMessageRow & { author?: UserRow | null; signedUrl?: string | null })[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      return;
    }
    const u = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (!supabaseClient || !clubId || !user) {
      setLoading(false);
      setAllowed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      // Membership gate (club-only, no teaser)
      const mem = await supabaseClient
        .from('club_members')
        .select('id,status')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .maybeSingle();
      const memRow = mem.data as { status?: string } | null;
      const ok = !mem.error && String(memRow?.status ?? '').toLowerCase() === 'approved';
      if (cancelled) return;
      setAllowed(ok);
      if (!ok) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient
        .from('club_messages')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: true })
        .limit(120);
      if (cancelled) return;
      if (error) {
        setMessages([]);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as ClubMessageRow[];
      const authorIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const authorById: Record<string, UserRow> = {};
      if (authorIds.length) {
        const { data: urows } = await supabaseClient.from('users').select('id,name,avatar_url').in('id', authorIds);
        for (const u of urows ?? []) {
          const r = u as { id: string; name?: string | null; avatar_url?: string | null };
          authorById[String(r.id)] = { id: String(r.id), name: r.name ?? null, avatar_url: r.avatar_url ?? null };
        }
      }

      const enriched = await Promise.all(
        rows.map(async (m) => {
          const bucket = String(m.media_bucket ?? '');
          const path = String(m.media_path ?? '');
          let signedUrl: string | null = null;
          if (bucket && path) {
            const { data: s } = await supabaseClient.storage.from(bucket).createSignedUrl(path, 60 * 10);
            signedUrl = s?.signedUrl ? String(s.signedUrl) : null;
          }
          return { ...m, author: authorById[m.user_id] ?? null, signedUrl };
        })
      );
      setMessages(enriched);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseClient, clubId, user]);

  const send = async () => {
    if (!supabaseClient || !clubId || !user) return;
    const body = text.trim();
    if (!body && !file) return;
    if (!allowed) return;

    setSending(true);
    try {
      let media_bucket: string | null = null;
      let media_path: string | null = null;
      let media_type: string | null = null;

      if (file) {
        if (file.size > 30 * 1024 * 1024) {
          showToast('Keep media under 30 MB for now', 'info');
          setSending(false);
          return;
        }
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          showToast('Use an image or video file', 'info');
          setSending(false);
          return;
        }
        media_bucket = 'club-chat-media';
        media_type = isImage ? 'image' : 'video';

        const extRaw = file.name.split('.').pop()?.toLowerCase() ?? (isImage ? 'jpg' : 'mp4');
        const ext = extRaw.slice(0, 8) || (isImage ? 'jpg' : 'mp4');
        const path = `${clubId}/${user.id}/${crypto.randomUUID()}.${isImage ? 'jpg' : ext}`;

        let uploadBody: Blob | File = file;
        let uploadType = file.type;
        if (isImage) {
          const maxEdge = isLimitedMediaDevice() ? 1400 : 2200;
          uploadBody = await resizeImageFileToJpegBlob(file, maxEdge, 0.88);
          uploadType = 'image/jpeg';
        }
        const { error: upErr } = await supabaseClient.storage.from(media_bucket).upload(path, uploadBody, {
          contentType: uploadType,
          upsert: false,
        });
        if (upErr) throw upErr;
        media_path = path;
      }

      const { data: inserted, error } = await supabaseClient
        .from('club_messages')
        .insert({
          club_id: clubId,
          user_id: user.id,
          content: body,
          media_type,
          media_bucket,
          media_path,
        })
        .select('*')
        .single();
      if (error) throw error;

      const row = inserted as ClubMessageRow;
      let signedUrl: string | null = null;
      if (row.media_bucket && row.media_path) {
        const { data: s } = await supabaseClient.storage.from(row.media_bucket).createSignedUrl(row.media_path, 60 * 10);
        signedUrl = s?.signedUrl ? String(s.signedUrl) : null;
      }
      setMessages((prev) => [
        ...prev,
        {
          ...row,
          author: { id: user.id, name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'You', avatar_url: (user.user_metadata?.avatar_url as string) || null },
          signedUrl,
        },
      ]);
      setText('');
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      showToast(msg ? String(msg) : 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">Sign in to open club chat.</p>
        <Link href="/login/" className="text-primary/90 font-bold">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background pb-safe-nav">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
          <div className="max-w-app-shell mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-card text-muted-foreground flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[16px] font-black text-foreground truncate flex-1">Club chat</h1>
          </div>
        </header>
        <div className="max-w-app-shell mx-auto px-4 py-10 text-center text-muted-foreground">
          This chat is for approved club members only.
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="max-w-app-shell mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-card text-muted-foreground flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[16px] font-black text-foreground truncate flex-1">Club chat</h1>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto px-4 pt-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-[13px] text-center py-10">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user.id;
            const label = (m.author?.name ?? 'Member').trim() || 'Member';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] rounded-2xl border ${mine ? 'bg-primary/15 border-primary/25' : 'bg-muted border-border'} overflow-hidden`}>
                  <div className="px-3 pt-2">
                    {!mine && <p className="text-[11px] font-bold text-muted-foreground">{label}</p>}
                    {m.content?.trim() ? (
                      <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words pb-2">
                        {m.content}
                      </p>
                    ) : null}
                  </div>
                  {m.signedUrl ? (
                    m.media_type === 'video' ? (
                      <video src={m.signedUrl} controls playsInline className="w-full max-h-[340px] bg-background" />
                    ) : (
                      <img src={m.signedUrl} alt="" className="w-full max-h-[420px] object-cover" />
                    )
                  ) : null}
                  <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </main>

      <div className="fixed composer-above-bottom-nav left-0 right-0 z-30">
        <div className="max-w-app-shell mx-auto px-4">
          {previewUrl ? (
            <div className="mb-2 rounded-xl border border-border bg-muted overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-[12px] text-muted-foreground flex items-center gap-2">
                  <ImageIcon size={14} className="text-primary/90" />
                  Attachment ready
                </p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove attachment"
                >
                  <X size={16} />
                </button>
              </div>
              {file?.type.startsWith('video/') ? (
                <video src={previewUrl} controls className="w-full max-h-[240px] bg-background" />
              ) : (
                <img src={previewUrl} alt="" className="w-full max-h-[240px] object-cover" />
              )}
            </div>
          ) : null}

          <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted p-2">
            <label className="w-10 h-10 rounded-xl border border-border bg-background/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <ImageIcon size={18} />
            </label>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message the club…"
              rows={1}
              className="flex-1 bg-transparent text-foreground/90 text-[14px] resize-none outline-none px-1 py-2 max-h-28"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="Send"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

