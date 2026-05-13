'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  MoreHorizontal,
  BadgeCheck,
  Mountain,
  Plus,
  ZoomIn,
  X,
  Image as ImageIcon,
  ChevronDown,
  Send,
  Flag,
  Bookmark,
  Loader2,
  Trash2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/SkeletonLoader';
import { FollowingStoriesStrip } from '@/components/stories/FollowingStoriesStrip';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { insertAdaptive, isLikelyUuid } from '@/lib/supabase/insertAdaptive';
import {
  deletePostLike,
  deleteSavedPost,
  fetchLikedPostIdRows,
  fetchSavedPostIdRows,
  fetchUserRepostedOriginalIds,
  insertPostLike,
  insertSavedPost,
} from '@/lib/supabase/resilientSocial';
import { mapDbTrailRow } from '@/lib/trails/mapDbTrail';
import {
  resolveOwnProfileDisplayName,
  resolvePublicDisplayName,
  snapshotPublicIdentity,
} from '@/lib/profileDisplay';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';
import {
  captureVideoFrameScaledDataUrl,
  isLimitedMediaDevice,
  resizeImageFileToJpegBlob,
} from '@/lib/media/mobileSafeCapture';

// ─── NewPostDrawer ─────────────────────────────────────────────────────────────

function NewPostDrawer({ open, onClose, onPosted }: {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const { user, profile, isConfigured, supabaseClient } = useAuth();
  const { showToast } = useToast();
  const [body, setBody] = useState('');
  const [rig, setRig] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  /** Always an image preview (for video we render a captured frame). */
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'inserting'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = '';
      // Reset on close
      setBody('');
      setRig('');
      setMediaFile(null);
      setImagePreview(null);
      setUploadProgress('idle');
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function dataUrlToBlob(dataUrl: string): Blob {
    const [head, body] = dataUrl.split(',');
    const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'image/jpeg';
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  const handleMediaPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast(isVideo ? 'Video must be under 50 MB' : 'Image must be under 10 MB', 'error');
      return;
    }

    setMediaFile(file);

    if (!isVideo) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    try {
      const blobUrl = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      v.src = blobUrl;
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('timeout')), 22_000);
        const onLoaded = () => {
          window.clearTimeout(timer);
          resolve();
        };
        const onErr = () => {
          window.clearTimeout(timer);
          reject(new Error('Could not read video'));
        };
        v.addEventListener('loadedmetadata', onLoaded, { once: true });
        v.addEventListener('error', onErr, { once: true });
      });
      const durationSec = Number.isFinite(v.duration) ? v.duration : NaN;
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(blobUrl);

      if (Number.isFinite(durationSec) && durationSec > 30) {
        showToast('Videos must be 30 seconds or shorter', 'error');
        setMediaFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const frame = await captureVideoFrameScaledDataUrl(file, 0.12);
      setImagePreview(frame);
    } catch {
      showToast('Could not read video', 'error');
      setMediaFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!body.trim() || isSubmitting) return;

    if (!isConfigured || !user) {
      showToast('Sign in to post to the community', 'info');
      return;
    }
    if (!supabaseClient) {
      showToast('Still connecting — try again in a moment', 'info');
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;
    let moderationStatus = 'approved';
    let postMedia: { type: 'image' | 'video'; bucket?: string; path?: string; thumbPath?: string } | null = null;

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // Upload first, then scan by public URL (small JSON) — avoids Vercel/Next 413 on large multipart bodies.
      let uploadedPath: string | null = null;
      let uploadedVideoPath: string | null = null;
      let uploadedVideoThumbPath: string | null = null;
      if (mediaFile && supabaseClient) {
        setUploadProgress('uploading');
        const isVideo = mediaFile.type.startsWith('video/');
        const id = `${Date.now()}`;
        if (!isVideo) {
          let uploadBlob: Blob = mediaFile;
          let contentType = mediaFile.type || 'application/octet-stream';
          let ext = mediaFile.name.split('.').pop() || 'jpg';
          if (isLimitedMediaDevice() && mediaFile.type.startsWith('image/')) {
            try {
              uploadBlob = await resizeImageFileToJpegBlob(mediaFile, 2000, 0.88);
              contentType = 'image/jpeg';
              ext = 'jpg';
            } catch {
              uploadBlob = mediaFile;
              contentType = mediaFile.type || 'application/octet-stream';
              ext = mediaFile.name.split('.').pop() || 'jpg';
            }
          }
          const path = `${user.id}/${id}.${ext}`;
          const { error: uploadError } = await supabaseClient.storage
            .from('post-images')
            .upload(path, uploadBlob, { upsert: true, contentType });
          if (uploadError) throw uploadError;
          uploadedPath = path;
          const { data: urlData } = supabaseClient.storage.from('post-images').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
          postMedia = { type: 'image', bucket: 'post-images', path };
        } else {
          const ext = mediaFile.name.split('.').pop() || 'mp4';
          const videoPath = `${user.id}/${id}/clip.${ext}`;
          const { error: vErr } = await supabaseClient.storage
            .from('post-media')
            .upload(videoPath, mediaFile, { upsert: true, contentType: mediaFile.type });
          if (vErr) throw vErr;
          uploadedVideoPath = videoPath;

          const frame0 = imagePreview ?? (await captureVideoFrameScaledDataUrl(mediaFile, 0.12));
          const thumbBlob = dataUrlToBlob(frame0);

          const thumbPublicPath = `${user.id}/${id}-thumb.jpg`;
          const { error: tErr } = await supabaseClient.storage
            .from('post-images')
            .upload(thumbPublicPath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
          if (tErr) throw tErr;
          uploadedPath = thumbPublicPath;
          const { data: urlData } = supabaseClient.storage.from('post-images').getPublicUrl(thumbPublicPath);
          imageUrl = urlData.publicUrl;

          const thumbPrivatePath = `${user.id}/${id}/thumb.jpg`;
          const { error: tpErr } = await supabaseClient.storage
            .from('post-media')
            .upload(thumbPrivatePath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
          if (tpErr) throw tpErr;
          uploadedVideoThumbPath = thumbPrivatePath;

          postMedia = { type: 'video', bucket: 'post-media', path: videoPath, thumbPath: thumbPrivatePath };
        }
      }

      if (imageUrl && accessToken) {
        const scanOnce = async (url: string) => {
          const scanRes = await fetch('/api/moderation/scan-image', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });
          const scanJson = await scanRes.json().catch(() => ({}));
          return { scanRes, scanJson };
        };

        const { scanRes, scanJson } = await scanOnce(imageUrl);
        if (scanRes.status === 422) {
          if (uploadedPath) {
            await supabaseClient.storage.from('post-images').remove([uploadedPath]);
          }
          if (uploadedVideoPath) {
            await supabaseClient.storage.from('post-media').remove([uploadedVideoPath]);
          }
          if (uploadedVideoThumbPath) {
            await supabaseClient.storage.from('post-media').remove([uploadedVideoThumbPath]);
          }
          const r = scanJson.reason as string | undefined;
          showToast(
            r === 'nudity_detected'
              ? 'That image was blocked by the safety filter.'
              : r === 'gore_detected'
                ? 'That image was blocked (graphic content).'
                : 'Image did not pass safety check.',
            'error'
          );
          setIsSubmitting(false);
          setUploadProgress('idle');
          return;
        }
        if (!scanRes.ok) {
          if (uploadedPath) {
            await supabaseClient.storage.from('post-images').remove([uploadedPath]);
          }
          if (uploadedVideoPath) {
            await supabaseClient.storage.from('post-media').remove([uploadedVideoPath]);
          }
          if (uploadedVideoThumbPath) {
            await supabaseClient.storage.from('post-media').remove([uploadedVideoThumbPath]);
          }
          showToast(scanJson.error ?? 'Image check failed', 'error');
          setIsSubmitting(false);
          setUploadProgress('idle');
          return;
        }

        if (mediaFile && mediaFile.type.startsWith('video/')) {
          // Basic frame sampling moderation — scaled frames + fewer seeks on iOS (WKWebView OOM).
          let probeDur = 30;
          try {
            const u = URL.createObjectURL(mediaFile);
            const vv = document.createElement('video');
            vv.preload = 'metadata';
            vv.muted = true;
            vv.playsInline = true;
            vv.setAttribute('playsinline', 'true');
            vv.setAttribute('webkit-playsinline', 'true');
            vv.src = u;
            await new Promise<void>((resolve, reject) => {
              const timer = window.setTimeout(() => reject(new Error('timeout')), 22_000);
              vv.addEventListener(
                'loadedmetadata',
                () => {
                  window.clearTimeout(timer);
                  resolve();
                },
                { once: true }
              );
              vv.addEventListener(
                'error',
                () => {
                  window.clearTimeout(timer);
                  reject(new Error('bad'));
                },
                { once: true }
              );
            });
            probeDur = Number.isFinite(vv.duration) ? vv.duration : 30;
            try {
              vv.pause();
              vv.removeAttribute('src');
              vv.load();
            } catch {
              /* ignore */
            }
            URL.revokeObjectURL(u);
          } catch {
            probeDur = 30;
          }

          const rawSamples = isLimitedMediaDevice()
            ? [Math.max(0.25, probeDur * 0.5)]
            : [10, 25];
          const sampleTimes = rawSamples.map((t) =>
            Math.min(Math.max(0.15, t), Math.max(0.2, probeDur - 0.1))
          );

          for (let i = 0; i < sampleTimes.length; i++) {
            const t = sampleTimes[i];
            if (isLimitedMediaDevice() && i > 0) {
              await new Promise((r) => window.setTimeout(r, 120));
            }
            const frame = await captureVideoFrameScaledDataUrl(mediaFile, t);
            const blob = dataUrlToBlob(frame);
            const tmpPath = `${user.id}/moderation/${Date.now()}-${Math.round(t * 1000)}.jpg`;
            const { error: upErr } = await supabaseClient.storage
              .from('post-images')
              .upload(tmpPath, blob, { upsert: true, contentType: 'image/jpeg' });
            if (upErr) throw upErr;
            const { data: tmpUrl } = supabaseClient.storage.from('post-images').getPublicUrl(tmpPath);
            const r2 = await scanOnce(tmpUrl.publicUrl);
            await supabaseClient.storage.from('post-images').remove([tmpPath]);
            if (r2.scanRes.status === 422) {
              if (uploadedPath) await supabaseClient.storage.from('post-images').remove([uploadedPath]);
              if (uploadedVideoPath) await supabaseClient.storage.from('post-media').remove([uploadedVideoPath]);
              if (uploadedVideoThumbPath) await supabaseClient.storage.from('post-media').remove([uploadedVideoThumbPath]);
              showToast('That video was blocked by the safety filter.', 'error');
              setIsSubmitting(false);
              setUploadProgress('idle');
              return;
            }
            if (!r2.scanRes.ok) {
              if (uploadedPath) await supabaseClient.storage.from('post-images').remove([uploadedPath]);
              if (uploadedVideoPath) await supabaseClient.storage.from('post-media').remove([uploadedVideoPath]);
              if (uploadedVideoThumbPath) await supabaseClient.storage.from('post-media').remove([uploadedVideoThumbPath]);
              showToast(r2.scanJson.error ?? 'Video check failed', 'error');
              setIsSubmitting(false);
              setUploadProgress('idle');
              return;
            }
          }
        }

        // If moderation is not configured, do not hide the post from other users.
        // Unsafe images return 422 and are blocked above.
        if (scanJson.skipped) {
          moderationStatus = 'approved';
        }
      }

      const userName = snapshotPublicIdentity(profile ?? undefined, user);
      const userRole = 'user'; // Default role; will be set to 'owner' via Supabase if applicable

      setUploadProgress('inserting');

      // Step 4: insert post — wide payload; strip unknown columns per DB (schema drift).
      const text = body.trim();
      const rigVal = rig.trim() || null;
      let insertPayload: Record<string, unknown> = {
        user_id: user.id,
        user_name: userName,
        caption: text,
        content: text,
        body: text,
        image_url: imageUrl,
        rig_model: rigVal,
        rig_name: rigVal,
        role: userRole,
      };
      if (postMedia?.type === 'video') {
        insertPayload.media_type = 'video';
        insertPayload.media_bucket = postMedia.bucket ?? 'post-media';
        insertPayload.media_path = postMedia.path ?? null;
        insertPayload.thumbnail_path = postMedia.thumbPath ?? null;
        insertPayload.processed_status = 'ready';
      }
      if (moderationStatus !== 'approved') {
        insertPayload.moderation_status = moderationStatus;
      }

      let { error: insertError } = await insertAdaptive(supabaseClient, 'posts', insertPayload);
      if (
        insertError &&
        String(insertError.message).toLowerCase().includes('moderation') &&
        'moderation_status' in insertPayload
      ) {
        const { moderation_status: _m, ...rest } = insertPayload;
        insertPayload = rest;
        ({ error: insertError } = await insertAdaptive(supabaseClient, 'posts', insertPayload));
      }
      if (
        insertError &&
        imageUrl == null &&
        /image_url|not-null|null value/i.test(insertError.message)
      ) {
        ({ error: insertError } = await insertAdaptive(supabaseClient, 'posts', {
          user_id: user.id,
          user_name: userName,
          caption: text,
          content: text,
          body: text,
          image_url: 'https://dummyimage.com/1x1/111111/111111.png',
          rig_model: rigVal,
          rig_name: rigVal,
          role: userRole,
        }));
      }

      if (insertError) throw new Error(insertError.message);

      showToast('Post uploaded!', 'success');
      onPosted?.();
      onClose();
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Unknown error';
      if (/failed to fetch/i.test(msg)) {
        msg =
          'Network error while posting (check connection). If it keeps happening, confirm Storage bucket post-images exists and Supabase URL is correct.';
      }
      showToast(`Failed to post: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('idle');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] max-w-app-shell mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
              <button onClick={onClose} aria-label="Close drawer" className="p-1 text-zinc-400 hover:text-white transition-colors">
                <ChevronDown size={22} />
              </button>
              <span className="font-bold text-white text-[15px]">New Post</span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSubmit}
                disabled={!body.trim() || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-[13px] rounded-full transition-colors min-w-[68px] justify-center"
              >
                {isSubmitting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full inline-block"
                  />
                ) : (
                  <>
                    <Send size={13} strokeWidth={2.5} />
                    Post
                  </>
                )}
              </motion.button>
            </div>

            {/* Body */}
            <div className="px-4 pt-4 pb-3">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened on the trail today?"
                maxLength={500}
                rows={4}
                className="w-full bg-transparent text-zinc-100 text-[15px] leading-relaxed placeholder:text-zinc-600 resize-none outline-none"
              />

              <input
                value={rig}
                onChange={(e) => setRig(e.target.value)}
                placeholder="Vehicle (e.g. 2022 Tacoma TRD Pro)"
                className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[13px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-orange-500/60 transition-colors"
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-3 rounded-xl overflow-hidden border border-zinc-800">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-cover" />
                  <button
                    onClick={() => { setMediaFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-zinc-300 hover:text-white"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Footer toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => void handleMediaPick(e)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  <ImageIcon size={18} strokeWidth={1.8} />
                  <span>
                    {mediaFile
                      ? mediaFile.name.slice(0, 20) + (mediaFile.name.length > 20 ? '…' : '')
                      : 'Add Photo/Video'}
                  </span>
                </button>
                {uploadProgress !== 'idle' && (
                  <span className="text-[11px] text-orange-400 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    {uploadProgress === 'uploading' ? 'Uploading…' : 'Saving…'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-600 font-mono">{body.length}/500</span>
            </div>

            {/* Sticky Post button */}
            <div className="px-4 pb-6 pt-2" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!body.trim() || isSubmitting}
                className="w-full py-4 rounded-2xl font-black text-[16px] flex items-center justify-center gap-2.5 transition-colors
                  disabled:bg-zinc-900 disabled:text-zinc-600
                  enabled:bg-orange-500 enabled:text-black enabled:shadow-lg enabled:shadow-orange-500/30 enabled:hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} strokeWidth={2.5} />
                    {body.trim() ? 'Post to Community' : 'Write something first…'}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  user_id: string;
  image_url?: string;
  media_type?: string | null;
  media_bucket?: string | null;
  media_path?: string | null;
  thumbnail_path?: string | null;
  body?: string;
  caption: string;
  rig_model?: string;
  rig_name?: string | null;
  rig_specs?: string;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  created_at: string;
  username?: string;
  user_name?: string;
  avatar_url?: string;
  verified?: boolean;
  role?: string;
  repost_of_id?: string | null;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  reposted_by_me?: boolean;
  original_user_name?: string | null;
  /** True when author is `clubs.owner_id` for at least one club (shown as HOME; independent of platform `users.role`). */
  club_founder_badge?: boolean;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_POSTS: Post[] = [
  {
    id: '1',
    user_id: '1',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=85',
    caption: 'Fresh back from Holcomb Valley. The JK handled every rock garden like it was made for it — because it was. Fully worth the 4am wake-up. #JeepLife #HolcombValley #SoCalOffroad',
    rig_model: '2018 Jeep Wrangler JK',
    rig_specs: '37" BFG KO2 · 4" Rough Country lift · ARB winch',
    likes_count: 47,
    comments_count: 12,
    reposts_count: 6,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    username: 'TrailBlazer_Mike',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
    verified: true,
    role: 'owner',
  },
  {
    id: '2',
    user_id: '2',
    caption: 'Johnson Valley OHV is absolutely wild right now after the rains. Trails are soft but the views make up for every stuck wheel. Anyone else heading out this weekend? #JohnsonValley #DesertOffroad #Raptor',
    rig_model: '2020 Ford F-150 Raptor',
    rig_specs: 'Bilstein 6112 · stock gearing · rear locker',
    likes_count: 89,
    comments_count: 23,
    reposts_count: 14,
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    username: 'DesertRunner_Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
    verified: true,
  },
  {
    id: '3',
    user_id: '3',
    image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=85',
    caption: 'Finally finished the front bumper swap. Took three weekends but the clearance angles are insane now. Big Bear run next Saturday — who\'s convoy-ing up? #TacomaLife #BigBear #BuildThread #PacificCrestTrail',
    rig_model: '2016 Toyota Tacoma TRD Pro',
    rig_specs: '33" Falken Wildpeak AT3W · Old Man Emu lift · CVT roof rack + RTT',
    likes_count: 124,
    comments_count: 31,
    reposts_count: 22,
    created_at: new Date(Date.now() - 14_400_000).toISOString(),
    username: 'TacoTuesday_Dan',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
    verified: false,
  },
  {
    id: '4',
    user_id: '4',
    caption: 'Reminder: Cleghorn trail is OPEN again as of yesterday. Verified with the ranger station this morning. Moderate difficulty — good for stock rigs with decent ground clearance. Save this for reference. #Cleghorn #TrailUpdate #SoCal',
    rig_model: '2023 Toyota 4Runner TRD Off-Road',
    rig_specs: 'KDSS · 285/70R17 Duratracs · SOS recovery bag',
    likes_count: 211,
    comments_count: 44,
    reposts_count: 67,
    created_at: new Date(Date.now() - 28_800_000).toISOString(),
    username: 'RangerRick_OHV',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
    verified: true,
  },
];

// LIVE_RUNS and TRAIL_UPDATES are now fetched dynamically in StoriesBar.

// ─── Helpers ─────�����────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function Caption({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('#') ? (
          <span key={i} className="text-orange-400 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Image Lightbox ────────────────────────────────────────────────────��──────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-full text-zinc-300 hover:text-white z-10"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <motion.img
        initial={{ scale: 0.88 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        src={src}
        alt={alt}
        className="max-w-full max-h-[90dvh] w-auto h-auto object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </motion.div>
  );
}

// ─── Story Avatar ─────────────────────────────────────────────────────────────

function StoryAvatar({
  src,
  alt,
  live,
  label,
  subtitle,
  href,
  runId,
}: {
  src: string;
  alt: string;
  live?: boolean;
  /** Usually run title */
  label: string;
  /** Usually trail name — shown under label when present */
  subtitle?: string;
  href: string;
  runId?: string;
}) {
  const router = useRouter();

  const handleClick = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    // Only deep-link to a run detail when it’s live — upcoming stays on /runs.
    if (live && runId) {
      router.push(`/runs/${runId}`);
      return;
    }
    router.push(href);
  };

  return (
    <button onClick={handleClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none">
      <motion.div whileTap={{ scale: 0.91 }} className="relative">
        {live && (
          <motion.div
            className="absolute -inset-1 rounded-full bg-orange-500/25"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.12, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className={`relative w-[58px] h-[58px] rounded-full p-[2px] ${live ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-zinc-800'}`}>
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950">
            <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
        {live && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-px bg-orange-500 text-black text-[8px] font-black uppercase rounded-full leading-tight">
            Live
          </span>
        )}
      </motion.div>
      <span className="text-[9px] text-zinc-500 text-center font-medium leading-tight max-w-[76px] w-[76px]">
        <span className="block line-clamp-2 break-words text-zinc-400">{label}</span>
        {subtitle ? (
          <span className="block line-clamp-2 break-words text-zinc-500 mt-0.5">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

// ─── StoriesBar ───────────────────────────────────────────────────────────────

interface LiveRun {
  id: string;
  title: string;
  trail_name: string | null;
  trail_photo: string | null;
  /** Only true when `status === 'active'` — pulsing ring + LIVE chip match real on-trail runs. */
  isLive: boolean;
}

function RunsReelEmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2.5 py-1 flex-shrink-0 text-center max-w-[260px] select-none">
      <div className="relative">
        <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-orange-500/30 via-orange-500/10 to-zinc-900 border border-orange-500/45 flex items-center justify-center shadow-[0_8px_28px_-8px_rgba(249,115,22,0.35)]">
          <span className="text-orange-400 font-black text-[15px] tracking-tight">SO</span>
        </div>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black border border-orange-500/60 text-[8px] font-black uppercase tracking-wider text-orange-400 whitespace-nowrap">
          Coming soon
        </span>
      </div>
      <div className="space-y-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-300">Runs reel</p>
        <p className="text-[10px] text-zinc-500 leading-snug px-1">
          Live & upcoming runs will show here — check back after the next trail day.
        </p>
      </div>
    </div>
  );
}

function StoriesBar({ embedded = false }: { embedded?: boolean } = {}) {
  const { supabaseClient } = useAuth();
  const [liveRuns, setLiveRuns] = useState<LiveRun[]>([]);

  useEffect(() => {
    if (!supabaseClient) return;
    let cancelled = false;
    void (async () => {
      type Row = { id: string; title?: string; trail_id?: string | null; status?: string };

      const loadRuns = async (): Promise<Row[]> => {
        const [activeRes, upcomingRes] = await Promise.all([
          supabaseClient
            .from('runs')
            .select('id, title, trail_id, status')
            .eq('status', 'active')
            .order('date', { ascending: true })
            .limit(10),
          supabaseClient
            .from('runs')
            .select('id, title, trail_id, status')
            .eq('status', 'upcoming')
            .order('date', { ascending: true })
            .limit(12),
        ]);

        const active = (!activeRes.error && activeRes.data ? activeRes.data : []) as Row[];
        const upcoming = (!upcomingRes.error && upcomingRes.data ? upcomingRes.data : []) as Row[];
        const seen = new Set(active.map((x) => x.id));
        const merged: Row[] = [
          ...active,
          ...upcoming.filter((u) => !seen.has(u.id)),
        ].slice(0, 14);

        if (merged.length) return merged;

        const fallback = await supabaseClient
          .from('runs')
          .select('id, title, trail_id, status')
          .order('date', { ascending: true })
          .limit(8);
        return (!fallback.error && fallback.data ? fallback.data : []) as Row[];
      };

      const rows = await loadRuns();
      if (cancelled) return;

      const trailIds = [...new Set(rows.map((x) => String(x.trail_id ?? '').trim()).filter(Boolean))];
      const photoById: Record<string, string | null> = {};
      const nameById: Record<string, string | null> = {};
      if (trailIds.length) {
        const tr = await supabaseClient.from('trails').select('*').in('id', trailIds);
        if (!tr.error && tr.data) {
          for (const row of tr.data as Record<string, unknown>[]) {
            const m = mapDbTrailRow(row);
            const id = String(m.id);
            photoById[id] = m.image ?? null;
            nameById[id] = m.name || null;
          }
        }
      }

      setLiveRuns(
        rows.map((r: Row) => ({
          id: r.id,
          title: r.title ?? 'Run',
          trail_name: r.trail_id ? nameById[String(r.trail_id)] ?? null : null,
          trail_photo: r.trail_id ? photoById[String(r.trail_id)] ?? null : null,
          isLive: String(r.status ?? '').toLowerCase() === 'active',
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient]);

  return (
    <div>
      {!embedded && (
        <div className="px-4 pt-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Runs</p>
        </div>
      )}
      <div
        className={`flex gap-3 px-4 overflow-x-auto scrollbar-hide [overscroll-behavior-x:contain] touch-pan-x ${embedded ? 'py-2' : 'py-3'} ${liveRuns.length === 0 && !embedded ? 'justify-center' : 'justify-start'}`}
      >
        {liveRuns.length === 0 ? (
          embedded ? (
            <div className="flex flex-1 min-w-0 justify-center">
              <RunsReelEmptyPlaceholder />
            </div>
          ) : (
            <RunsReelEmptyPlaceholder />
          )
        ) : (
          liveRuns.map((run) => (
            <StoryAvatar
              key={run.id}
              src={run.trail_photo ?? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&q=80'}
              alt={
                run.trail_name
                  ? `${run.title} · ${run.trail_name}`
                  : run.title
              }
              live={run.isLive}
              label={run.trail_name ?? run.title}
              subtitle={run.trail_name ? run.title : undefined}
              href="/runs"
              runId={run.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Runs / Stories pager (Runs first — main feature; Stories second; independent horizontal scroll) ─

function HomeStoriesRunsPager({
  supabaseClient,
  user,
}: {
  supabaseClient: ReturnType<typeof useAuth>['supabaseClient'];
  user: ReturnType<typeof useAuth>['user'];
}) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const [activeStrip, setActiveStrip] = useState<'stories' | 'runs'>('runs');

  const syncTabFromScroll = useCallback(() => {
    const el = pagerRef.current;
    if (!el || el.clientWidth < 8) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setActiveStrip(page <= 0 ? 'runs' : 'stories');
  }, []);

  const goStrip = useCallback((strip: 'stories' | 'runs') => {
    const el = pagerRef.current;
    if (!el) return;
    const page = strip === 'runs' ? 0 : 1;
    el.scrollTo({ left: page * el.clientWidth, behavior: 'smooth' });
    setActiveStrip(strip);
  }, []);

  return (
    <div className="sticky top-[52px] z-40 bg-black border-b border-zinc-900">
      <div className="flex border-b border-zinc-800">
        <button
          type="button"
          onClick={() => goStrip('runs')}
          className={`relative flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-wider transition-colors touch-manipulation ${
            activeStrip === 'runs' ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Runs
          {activeStrip === 'runs' && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-orange-500" />
          )}
        </button>
        <button
          type="button"
          onClick={() => goStrip('stories')}
          className={`relative flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-wider transition-colors touch-manipulation ${
            activeStrip === 'stories' ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Stories
          {activeStrip === 'stories' && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-orange-500" />
          )}
        </button>
      </div>

      <div
        ref={pagerRef}
        onScroll={syncTabFromScroll}
        className="flex items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide scroll-smooth touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <section className="snap-start snap-always shrink-0 grow-0 basis-full w-full min-h-0 min-w-0 box-border overflow-x-hidden">
          <StoriesBar embedded />
        </section>
        <section className="snap-start snap-always shrink-0 grow-0 basis-full w-full min-h-0 min-w-0 box-border overflow-x-hidden">
          <FollowingStoriesStrip embedded supabaseClient={supabaseClient} user={user} />
        </section>
      </div>
    </div>
  );
}

// ─── Stat Button ──────────────────────────────────────────────────────────────

function StatBtn({
  icon: Icon,
  count,
  active,
  activeColor,
  label,
  onClick,
  showCountIncludingZero,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  activeColor?: string;
  label: string;
  onClick?: () => void;
  /** When true, render the numeric count even when it is 0 (e.g. reposts). */
  showCountIncludingZero?: boolean;
}) {
  const showCount =
    count !== undefined && (showCountIncludingZero || count > 0);
  return (
    <motion.button
      whileTap={{ scale: 1.28 }}
      transition={{ type: 'spring', stiffness: 600, damping: 14 }}
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1.5 group transition-colors ${
        active && activeColor ? activeColor : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon size={17} className={active ? '' : 'group-hover:scale-110 transition-transform'} strokeWidth={1.8} />
      {showCount && (
        <span className="text-[12px] font-medium tabular-nums">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}</span>
      )}
    </motion.button>
  );
}

// ─── CommentRow ───────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  onLike,
  onFlag,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onLike: (c: Comment) => void;
  onFlag: (c: Comment) => void;
  onReply: (c: Comment) => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex gap-2 items-start group">
      <div className={`${isReply ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden`}>
        {comment.avatar_url ? (
          <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-500">
            {(comment.user_name ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-zinc-300">{comment.user_name ?? 'Rider'}</span>
          {(comment.role?.toLowerCase() === 'owner' || comment.role?.toLowerCase() === 'admin') && (
            <span
              title={comment.role?.toLowerCase() === 'admin' ? 'Team admin' : 'Team owner'}
              className="px-1.5 py-px text-[9px] font-black text-black bg-orange-500 rounded leading-none flex-shrink-0"
            >
              SO
            </span>
          )}
          <span className="text-[12px] text-zinc-400 break-words">{comment.content}</span>
        </div>
        {/* Sub-row: actions */}
        <div className="flex items-center gap-3 mt-0.5">
          {/* Comment like */}
          <button
            onClick={() => onLike(comment)}
            aria-label={comment.liked_by_me ? 'Unlike comment' : 'Like comment'}
            className={`flex items-center gap-0.5 text-[11px] transition-colors ${
              comment.liked_by_me ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Heart size={10} className={comment.liked_by_me ? 'fill-orange-400' : ''} strokeWidth={1.8} />
            {(comment.likes_count ?? 0) > 0 && <span>{comment.likes_count}</span>}
          </button>
          {/* Reply */}
          <button
            onClick={() => onReply(comment)}
            aria-label="Reply"
            className="text-[11px] text-zinc-600 hover:text-sky-400 transition-colors"
          >
            Reply
          </button>
          {/* Flag */}
          <button
            onClick={() => onFlag(comment)}
            aria-label="Flag comment"
            className="text-[11px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Flag size={10} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RigPostCard ──────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user_name?: string | null;
  avatar_url?: string | null;
  parent_id?: string | null;
  role?: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
}

function RigPostCard({ post, index }: {
  post: Post;
  index: number;
}) {
  const { user, profile, isConfigured, supabaseClient } = useAuth();

  /** Likes, bookmarks, repost target, comments, and permalinks use the canonical thread. */
  const canonicalPostId = String(post.repost_of_id ?? post.id);

  const headerRole = (() => {
    const r = String(post.role ?? 'user').toLowerCase();
    if (user?.id && post.user_id === user.id && profile?.role != null && String(profile.role).trim()) {
      return String(profile.role).toLowerCase();
    }
    return r;
  })();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [reposted, setReposted] = useState(post.reposted_by_me ?? false);
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [postFlagged, setPostFlagged] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoSignedUrl, setVideoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    setAvatarError(false);
  }, [post.avatar_url, post.id]);

  useEffect(() => {
    let cancelled = false;
    setVideoSignedUrl(null);
    if (!supabaseClient) return;
    if (String(post.media_type ?? '').toLowerCase() !== 'video') return;
    const bucket = String(post.media_bucket ?? 'post-media');
    const path = String(post.media_path ?? '').trim();
    if (!path) return;
    void (async () => {
      const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (cancelled) return;
      if (!error && data?.signedUrl) setVideoSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, post.id, post.media_type, post.media_bucket, post.media_path]);

  useEffect(() => {
    setRepostsCount(post.reposts_count ?? 0);
  }, [canonicalPostId, post.reposts_count]);

  useEffect(() => {
    setLikesCount(post.likes_count ?? 0);
  }, [canonicalPostId, post.likes_count]);

  useEffect(() => {
    setCommentsCount(post.comments_count ?? 0);
  }, [canonicalPostId, post.comments_count]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  /** False when `comment_likes` table is missing or query fails (avoid noisy 404 loops). */
  const commentLikesReadyRef = useRef(true);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function haptic(s: ImpactStyle) { try { await Haptics.impact({ style: s }); } catch {} }

  // Track whether the drawer was just opened so we can auto-focus the input.
  const drawerJustOpened = useRef(false);
  useEffect(() => {
    if (commentsOpen) drawerJustOpened.current = true;
  }, [commentsOpen]);

  // Fetch comments on mount as soon as auth has settled.
  // NOT gated on commentsOpen — comments load in the background so the count
  // is always correct without the user needing to open the drawer.
  // commentsOpen is intentionally NOT in the dep array to avoid re-fetching
  // every time the drawer opens/closes and clearing any optimistic state.
  useEffect(() => {
    if (!supabaseClient) return;

    // CRITICAL: use the original post's ID for reposts — comments are anchored
    // to the canonical thread, not the repost copy.
    const canonicalId = post.repost_of_id ?? post.id;

    setCommentsLoading(true);

    // Placeholder feed IDs (e.g. "2") are not UUIDs — comments FK expects uuid → skip query (400).
    if (!isLikelyUuid(canonicalId)) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    Promise.all([
      // Use select('*') to avoid 400 errors if some columns don't exist yet.
      supabaseClient
        .from('comments')
        .select('*')
        .eq('post_id', canonicalId)
        .order('created_at', { ascending: true }),
      user && commentLikesReadyRef.current
        ? supabaseClient
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    ]).then(async ([{ data: rawComments, error: commentsError }, likesRes]) => {
      if (commentsError) {
        setCommentsLoading(false);
        return;
      }

      if (likesRes.error) {
        commentLikesReadyRef.current = false;
      }

      const rows = rawComments ?? [];
      const myLikes = likesRes.error ? [] : (likesRes.data ?? []);

      const distinctUserIds = [...new Set(rows.map((c: any) => c.user_id as string))];
      const roleMap: Record<string, string | null> = {};
      type AuthorProf = {
        name?: string | null;
        username?: string | null;
        hide_display_name?: boolean | null;
        email?: string | null;
        avatar_url?: string | null;
      };
      const profileById: Record<string, AuthorProf> = {};
      if (distinctUserIds.length > 0) {
        const { data: userRows } = await supabaseClient
          .from('users')
          .select('id, role, name, username, hide_display_name, email, avatar_url')
          .in('id', distinctUserIds);
        (userRows ?? []).forEach((u: any) => {
          roleMap[u.id] = u.role ?? null;
          profileById[u.id] = {
            name: u.name ?? null,
            username: u.username ?? null,
            hide_display_name: u.hide_display_name ?? null,
            email: u.email ?? null,
            avatar_url: u.avatar_url ?? null,
          };
        });
      }

      const viewerId = user?.id ?? null;
      const commentAuthorLabel = (uid: string, fallbackUserName?: string | null): string => {
        const p = profileById[uid];
        if (!p) return String(fallbackUserName ?? '').trim();
        const base = {
          id: uid,
          name: p.name,
          username: p.username,
          hide_display_name: p.hide_display_name,
          email:
            viewerId && uid === viewerId ? user?.email ?? p.email ?? null : p.email ?? null,
        };
        return viewerId && uid === viewerId
          ? resolveOwnProfileDisplayName(base)
          : resolvePublicDisplayName(base);
      };

      const likedIds = new Set(myLikes.map((l: any) => l.comment_id));
      const enriched: Comment[] = rows.map((c: any) => {
        const uid = String(c.user_id);
        const p = profileById[uid];
        const label =
          commentAuthorLabel(uid, c.user_name).trim() ||
          String(c.user_name ?? '').trim() ||
          'Rider';
        const profAv =
          p?.avatar_url != null && String(p.avatar_url).trim()
            ? String(p.avatar_url).trim()
            : undefined;
        const rowAv =
          c.avatar_url != null && String(c.avatar_url).trim()
            ? String(c.avatar_url).trim()
            : undefined;
        const avatarUrl = profAv ?? rowAv ?? null;

        return {
          ...c,
          role: roleMap[c.user_id] ?? c.role ?? null,
          content: c.content ?? '',
          user_name: label,
          avatar_url: avatarUrl,
          liked_by_me: likedIds.has(c.id),
          likes_count: c.likes_count ?? 0,
        };
      });

      setComments(enriched);
      setCommentsCount(enriched.length);
      setCommentsLoading(false);
      if (drawerJustOpened.current) {
        drawerJustOpened.current = false;
        setTimeout(() => commentInputRef.current?.focus(), 150);
      }
    });
   
  }, [supabaseClient, post.id, post.repost_of_id, user]);

  const requireAuth = (action: string): boolean => {
    if (!user) {
      showToast(`Sign in to ${action}`, 'info');
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    await haptic(ImpactStyle.Medium);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikesCount((c) => (nowLiked ? c + 1 : c - 1));

    if (user && isConfigured && supabaseClient) {
      try {
        if (nowLiked) {
          const { error } = await insertPostLike(supabaseClient, user.id, canonicalPostId);
          if (error && error.code !== '23505') throw error;
        } else {
          const { error } = await deletePostLike(supabaseClient, user.id, canonicalPostId);
          if (error) throw error;
        }
      } catch {
        setLiked(!nowLiked);
        setLikesCount((c) => (nowLiked ? c - 1 : c + 1));
        showToast('Could not save like. Try again.', 'error');
      }
    } else if (!user) {
      showToast('Sign in to like posts', 'info');
    }
  };

  const toggleRepost = async () => {
    if (!requireAuth('repost')) return;
    if (!supabaseClient || !user) return;
    await haptic(ImpactStyle.Light);
    if (reposted) {
      // Un-repost: delete the repost row
      const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('user_id', user.id)
        .eq('repost_of_id', canonicalPostId);
      if (!error) {
        setReposted(false);
        setRepostsCount((c) => Math.max(0, c - 1));
      } else {
        showToast(error.message || 'Could not remove repost', 'error');
      }
    } else {
      const userName = snapshotPublicIdentity(profile ?? undefined, user);
      // Shell row: no duplicated text in DB; feed merges body from original. Keep image for profile grids / shares.
      const { error } = await insertAdaptive(supabaseClient, 'posts', {
        user_id: user.id,
        user_name: userName,
        caption: '',
        content: '',
        body: '',
        image_url: post.image_url
          ? ensureStoragePublicObjectUrl(post.image_url) || post.image_url
          : null,
        rig_model: null,
        rig_name: null,
        repost_of_id: canonicalPostId,
        role: 'user',
      });
      if (!error) {
        setReposted(true);
        setRepostsCount((c) => c + 1);
        showToast('Reposted!', 'success');
      } else {
        showToast(error.message || 'Could not repost', 'error');
      }
    }
  };

  const flagPost = async () => {
    if (!requireAuth('flag posts')) return;
    if (!supabaseClient || !user || postFlagged) return;
    const { error } = await supabaseClient
      .from('post_flags')
      .insert({ post_id: canonicalPostId, user_id: user.id, reason: 'flagged' });
    if (!error) { setPostFlagged(true); showToast('Post flagged for review', 'info'); }
  };

  const toggleCommentLike = async (comment: Comment) => {
    if (!requireAuth('like comments')) return;
    if (!supabaseClient || !user) return;
    if (!commentLikesReadyRef.current) {
      showToast('Comment likes need the comment_likes table in Supabase', 'info');
      return;
    }
    const commentId = comment.id;

    // Read current liked state directly from the flat comments array so stale
    // closure values from nested renders don't cause a double-toggle.
    let nowLiked = false;
    setComments((prev) => {
      const current = prev.find((c) => c.id === commentId);
      nowLiked = !(current?.liked_by_me ?? false);
      return prev.map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: nowLiked, likes_count: (c.likes_count ?? 0) + (nowLiked ? 1 : -1) }
          : c
      );
    });

    if (nowLiked) {
      const { error } = await supabaseClient
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: user.id });
      if (error && error.code !== '23505') {
        commentLikesReadyRef.current = false;
        // Rollback on unexpected error
        setComments((prev) => prev.map((c) =>
          c.id === commentId ? { ...c, liked_by_me: false, likes_count: (c.likes_count ?? 1) - 1 } : c
        ));
      }
    } else {
      const { error } = await supabaseClient
        .from('comment_likes')
        .delete()
        .match({ comment_id: commentId, user_id: user.id });
      if (error) commentLikesReadyRef.current = false;
    }
  };

  const flagComment = async (comment: Comment) => {
    if (!requireAuth('flag comments')) return;
    if (!supabaseClient || !user) return;
    const { error } = await supabaseClient
      .from('comment_flags')
      .insert({ comment_id: comment.id, user_id: user.id, reason: 'flagged' });
    if (!error) showToast('Comment flagged', 'info');
  };

  const toggleBookmark = async () => {
    await haptic(ImpactStyle.Light);
    if (!requireAuth('save posts')) return;
    const nowSaved = !bookmarked;
    setBookmarked(nowSaved);
    if (supabaseClient && user) {
      try {
        if (nowSaved) {
          const { error } = await insertSavedPost(supabaseClient, user.id, canonicalPostId);
          if (error && error.code !== '23505') throw error;
        } else {
          const { error } = await deleteSavedPost(supabaseClient, user.id, canonicalPostId);
          if (error) throw error;
        }
      } catch {
        setBookmarked(!nowSaved);
        showToast('Could not update bookmark', 'error');
      }
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user || !supabaseClient) return;
    if (!requireAuth('comment')) return;
    setSubmittingComment(true);
    // Always anchor the comment to the original post so comments are shared
    // across all reposts of the same content (canonicalPostId).
    const userName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Rider';
    const avatarUrl = (user.user_metadata?.avatar_url as string) || null;
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      post_id: canonicalPostId,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      user_name: userName,
      avatar_url: avatarUrl,
      parent_id: replyingTo?.id ?? null,
      liked_by_me: false,
      likes_count: 0,
    };
    setComments((c) => [...c, optimistic]);
    setCommentsCount((n) => n + 1);
    setCommentText('');
    setReplyingTo(null);
    try {
      if (!isLikelyUuid(String(canonicalPostId))) throw new Error('Invalid post id');
      const { error } = await insertAdaptive(supabaseClient, 'comments', {
        post_id: canonicalPostId,
        user_id: user.id,
        content: optimistic.content,
        body: optimistic.content,
        user_name: userName,
        avatar_url: avatarUrl,
      });
      if (error) throw new Error(error.message);
    } catch {
      setComments((c) => c.filter((x) => x.id !== optimistic.id));
      setCommentsCount((n) => n - 1);
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    await haptic(ImpactStyle.Light);
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/posts/${canonicalPostId}`
        : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${post.username}'s Rig`, text: post.caption, url });
        showToast('Post shared!', 'success');
      } catch {}
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
      } catch {}
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !user) return;
    setIsReporting(true);
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('reports').insert({
          post_id: canonicalPostId,
          reporter_id: user.id,
          reason: reportReason,
        });
        if (error) throw error;
      }
      showToast('Report submitted. Thank you.', 'success');
      setReportOpen(false);
      setReportReason('');
      setMenuOpen(false);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '';
      showToast(msg ? `Report failed: ${msg}` : 'Failed to submit report', 'error');
    } finally {
      setIsReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!supabaseClient || !user) return;
    if (!isLikelyUuid(String(post.id))) {
      showToast('Cannot delete demo posts', 'info');
      return;
    }
    const modRole = String(profile?.role ?? '').toLowerCase();
    const isModerator = modRole === 'owner' || modRole === 'admin';
    if (user.id !== post.user_id && !isModerator) {
      showToast('You cannot delete this post', 'error');
      return;
    }
    try {
      // Single filter: RLS allows delete when auth.uid() = user_id (author) or when a
      // moderator policy matches (see migration posts_moderator_delete_rls).
      const { error } = await supabaseClient.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      showToast('Post deleted', 'success');
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.reload();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '';
      showToast(msg ? `Could not delete: ${msg}` : 'Failed to delete post', 'error');
    }
  };

  return (
    <>
      <motion.article
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="flex gap-3 px-4 py-4 border-b border-zinc-900 bg-black"
      >
        {/* ── Left column: avatar ───────────────── */}
        <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 pt-0.5 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
            {post.avatar_url && !avatarError ? (
              <img
                src={post.avatar_url}
                alt={post.username ?? 'User'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                {(post.username ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* ── Right column: content ─────────────── */}
        <div
          className={`flex-1 min-w-0${post.repost_of_id ? ' rounded-r-xl border-l-2 border-emerald-500/35 bg-zinc-950/40 pl-3 -ml-0.5' : ''}`}
        >
          {post.repost_of_id ? (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5 -mt-0.5">
              <Repeat2 size={12} className="text-emerald-500/90 shrink-0" aria-hidden />
              <span className="leading-snug">
                <span className="font-semibold text-zinc-400">{post.username ?? 'Member'}</span>
                {' '}reposted
                {post.original_user_name ? (
                  <>
                    {' '}
                    · Original by{' '}
                    <span className="text-zinc-300 font-medium">{post.original_user_name}</span>
                  </>
                ) : null}
              </span>
            </div>
          ) : null}

          {/* Header row: name + verified + vehicle + time + menu */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              {/* Name + verified */}
              <Link href={`/profile/${post.user_id}`} className="flex items-center gap-1 flex-wrap hover:opacity-80 transition-opacity">
                <span className="font-bold text-[14px] text-white leading-snug">
                  {post.username ?? 'Anonymous'}
                </span>
                {post.verified && (
                  <BadgeCheck size={15} className="text-orange-500 flex-shrink-0 mt-px" />
                )}
                {(headerRole === 'owner' || headerRole === 'admin') && (
                  <span
                    title={headerRole === 'admin' ? 'SoCalOffroaders admin' : 'SoCalOffroaders owner'}
                    className="px-1.5 py-0.5 text-[9px] font-black text-black bg-orange-500 rounded-md leading-none flex-shrink-0"
                  >
                    SO
                  </span>
                )}
                {post.club_founder_badge ? (
                  <span
                    title="Club founder"
                    className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-950 bg-emerald-400 rounded-md leading-none flex-shrink-0"
                  >
                    HOME
                  </span>
                ) : null}
              </Link>
              {(post.rig_model || post.rig_specs) && (
                <span className="text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-px rounded-full font-medium leading-snug truncate max-w-[160px]">
                  {post.rig_model || post.rig_specs}
                </span>
              )}
              <span className="text-[11px] text-zinc-600">{timeAgo(post.created_at)}</span>
            </div>

            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 -mt-0.5 -mr-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded-full"
                aria-label="More options"
              >
                <MoreHorizontal size={18} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-7 z-50 min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/60 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `${window.location.origin}/posts/${canonicalPostId}`
                        );
                        showToast('Link copied', 'success');
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <Share2 size={14} className="text-zinc-500" /> Copy Link
                    </button>
                    <button
                      onClick={() => { setReportOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-red-400 hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
                    >
                      <Flag size={14} /> Report Post
                    </button>
                    {(user?.id === post.user_id ||
                      profile?.role === 'owner' ||
                      profile?.role === 'admin') && (
                      <button
                        onClick={() => { handleDelete(); setMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors text-left border-t border-zinc-800"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Caption body */}
          <p className="text-[14px] text-zinc-200 leading-relaxed mb-3">
              <Caption text={post.body ?? post.caption} />
          </p>

          {/* Optional media — natural aspect ratio, NOT forced square */}
          {String(post.media_type ?? '').toLowerCase() === 'video' ? (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
              {videoSignedUrl ? (
                <video
                  src={videoSignedUrl}
                  className="w-full object-cover"
                  playsInline
                  loop
                  muted
                  controls
                />
              ) : post.image_url ? (
                <img
                  src={ensureStoragePublicObjectUrl(post.image_url) || post.image_url}
                  alt={post.caption}
                  className="w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-56 bg-zinc-900 animate-pulse" aria-hidden />
              )}
            </div>
          ) : post.image_url ? (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group cursor-zoom-in">
              <img
                src={ensureStoragePublicObjectUrl(post.image_url) || post.image_url}
                alt={post.caption}
                className="w-full object-cover"
                loading="lazy"
                onClick={() => setLightboxOpen(true)}
                draggable={false}
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Zoom image"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          ) : null}

          {/* Rig specs pill row */}
          {post.rig_specs && (
            <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
              <span className="inline-block bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5 text-zinc-400">
                {post.rig_specs}
              </span>
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatBtn
                icon={MessageCircle}
                count={commentsCount}
                active={commentsOpen}
                activeColor="text-sky-400"
                label="Comment"
                showCountIncludingZero
                onClick={() => {
                  if (!requireAuth('comment')) return;
                  setCommentsOpen((o) => !o);
                }}
              />
              <StatBtn
                icon={Repeat2}
                count={repostsCount}
                active={reposted}
                activeColor="text-emerald-500"
                label={reposted ? 'Unrepost' : 'Repost'}
                onClick={toggleRepost}
                showCountIncludingZero
              />
              <StatBtn
                icon={Heart}
                count={likesCount}
                active={liked}
                activeColor="text-orange-500"
                label={liked ? 'Unlike' : 'Like'}
                showCountIncludingZero
                onClick={toggleLike}
              />
              <StatBtn icon={Share2} label="Share" onClick={handleShare} />
              <motion.button
                whileTap={{ scale: 1.2 }}
                onClick={flagPost}
                disabled={postFlagged}
                aria-label="Flag post"
                title="Flag for review"
                className={`transition-colors ${postFlagged ? 'text-red-400' : 'text-zinc-600 hover:text-red-400'}`}
              >
                <Flag size={15} strokeWidth={1.8} />
              </motion.button>
            </div>
            <motion.button
              whileTap={{ scale: 1.28 }}
              transition={{ type: 'spring', stiffness: 600, damping: 14 }}
              onClick={toggleBookmark}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
              className={`transition-colors ${bookmarked ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Bookmark size={17} strokeWidth={1.8} className={bookmarked ? 'fill-orange-500/40' : ''} />
            </motion.button>
          </div>

          {/* Inline comment panel */}
          <AnimatePresence>
            {commentsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-zinc-800/60 mt-3 space-y-3">
                  {/* Comment list */}
                  {commentsLoading ? (
                    <div className="text-zinc-600 text-[12px] py-1">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-zinc-600 text-[12px] py-1">No comments yet. Be the first.</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {/* Top-level comments first, then replies */}
                      {comments.filter((c) => !c.parent_id).map((c) => (
                        <div key={c.id}>
                          <CommentRow
                            comment={c}
                            onLike={toggleCommentLike}
                            onFlag={flagComment}
                            onReply={(c) => { setReplyingTo(c); setTimeout(() => commentInputRef.current?.focus(), 80); }}
                          />
                          {/* Replies (indented) */}
                          {comments.filter((r) => r.parent_id === c.id).map((reply) => (
                            <div key={reply.id} className="ml-7 mt-1.5 flex items-start gap-1 text-zinc-600">
                              <CornerDownRight size={11} className="mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <CommentRow
                                  comment={reply}
                                  onLike={toggleCommentLike}
                                  onFlag={flagComment}
                                  onReply={(c) => { setReplyingTo(c); setTimeout(() => commentInputRef.current?.focus(), 80); }}
                                  isReply
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply-to chip */}
                  {replyingTo && (
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-900 rounded-lg px-2 py-1">
                      <CornerDownRight size={11} className="text-sky-400 flex-shrink-0" />
                      <span className="flex-1 truncate">Replying to <span className="text-zinc-300 font-semibold">{replyingTo.user_name ?? 'Rider'}</span></span>
                      <button onClick={() => setReplyingTo(null)} className="text-zinc-600 hover:text-white transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url as string} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-500">
                          {user?.email?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                      )}
                    </div>
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                      placeholder={replyingTo ? `Reply to ${replyingTo.user_name ?? 'Rider'}…` : 'Add a comment…'}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={submitComment}
                      disabled={!commentText.trim() || submittingComment}
                      aria-label="Post comment"
                      className="text-orange-500 disabled:text-zinc-700 transition-colors flex-shrink-0"
                    >
                      {submittingComment ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2} />}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && post.image_url && (
          <ImageLightbox
            src={ensureStoragePublicObjectUrl(post.image_url) || post.image_url}
            alt={post.caption}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Report Sheet */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9992] bg-black/70 backdrop-blur-sm"
              onClick={() => setReportOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-[9993] max-w-app-shell mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl p-5"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-[15px] flex items-center gap-2">
                  <Flag size={15} className="text-red-400" /> Report Post
                </h3>
                <button onClick={() => setReportOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-zinc-400 mb-3">Why are you reporting this post?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {['Spam', 'Misinformation', 'Harassment', 'Inappropriate', 'Dangerous activity', 'Other'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={`py-2.5 px-3 rounded-xl text-[12px] font-medium border transition-colors text-left ${
                      reportReason === r
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={submitReport}
                disabled={!reportReason || isReporting}
                className="w-full py-3 bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-[14px] rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isReporting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={15} />}
                {isReporting ? 'Submitting…' : 'Submit Report'}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Pull-to-refresh container ────────────────────────────────────────────────

function PullToRefreshFeed({ children, onRefresh }: { children: React.ReactNode; onRefresh: () => Promise<void> }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const THRESHOLD = 72;

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      pullDistance.current = delta;
      setPulling(delta > 20);
    }
  };

  const onTouchEnd = async () => {
    if (pullDistance.current > THRESHOLD && !refreshing) {
      setRefreshing(true);
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      await onRefresh();
      setRefreshing(false);
    }
    startY.current = 0;
    pullDistance.current = 0;
    setPulling(false);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="flex justify-center py-4"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

// ─── Page ───��─────────────────────────────────────────────────────────────────

// ─── Moderation Panel ─────────────────────────────────────────────────────────

function ModerationPanel() {
  const { supabaseClient } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    const [postFlagData, commentFlagData] = await Promise.all([
      supabaseClient.from('post_flags').select('post_id'),
      supabaseClient.from('comment_flags').select('comment_id'),
    ]);

    if (postFlagData.error || commentFlagData.error) {
      const msg = postFlagData.error?.message ?? commentFlagData.error?.message ?? 'unknown error';
      console.warn('[Moderation]', msg);
      showToast(
        'Moderation queue could not load. Apply latest Supabase migrations (flags / RLS).',
        'error'
      );
      setFlaggedPosts([]);
      setFlaggedComments([]);
      setLoading(false);
      return;
    }

    const postCounts: Record<string, number> = {};
    (postFlagData.data ?? []).forEach((r: any) => {
      postCounts[r.post_id] = (postCounts[r.post_id] ?? 0) + 1;
    });
    const flaggedPostIds = Object.entries(postCounts).filter(([, n]) => n >= 3).map(([id]) => id);

    const commentCounts: Record<string, number> = {};
    (commentFlagData.data ?? []).forEach((r: any) => {
      commentCounts[r.comment_id] = (commentCounts[r.comment_id] ?? 0) + 1;
    });
    const flaggedCommentIds = Object.entries(commentCounts).filter(([, n]) => n >= 3).map(([id]) => id);

    const [postRows, commentRows] = await Promise.all([
      flaggedPostIds.length > 0
        ? supabaseClient.from('posts').select('*').in('id', flaggedPostIds)
        : Promise.resolve({ data: [] }),
      flaggedCommentIds.length > 0
        ? supabaseClient.from('comments').select('*').in('id', flaggedCommentIds)
        : Promise.resolve({ data: [] }),
    ]);

    setFlaggedPosts(postRows.data ?? []);
    setFlaggedComments(commentRows.data ?? []);
    setLoading(false);
  };

  const dismiss = async (type: 'post' | 'comment', id: string) => {
    if (!supabaseClient) return;
    if (type === 'post') {
      await supabaseClient.from('post_flags').delete().eq('post_id', id);
      setFlaggedPosts((p) => p.filter((x) => x.id !== id));
    } else {
      await supabaseClient.from('comment_flags').delete().eq('comment_id', id);
      setFlaggedComments((p) => p.filter((x) => x.id !== id));
    }
  };

  const totalFlags = flaggedPosts.length + flaggedComments.length;

  return (
    <>
      <button
        onClick={() => { setOpen(true); load(); }}
        className="relative flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-colors"
      >
        <ShieldAlert size={13} />
        Moderation
        {totalFlags > 0 && (
          <span className="ml-0.5 bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-px leading-none">
            {totalFlags}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-[9991] max-w-app-shell mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl max-h-[80dvh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-400" />
                  <h3 className="font-bold text-white text-[15px]">Moderation Queue</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center pt-4"><Loader2 size={20} className="animate-spin text-zinc-600" /></div>
                ) : (flaggedPosts.length + flaggedComments.length) === 0 ? (
                  <p className="text-zinc-600 text-[14px] text-center pt-4">No flagged content.</p>
                ) : (
                  <>
                    {flaggedPosts.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Flagged Posts ({flaggedPosts.length})
                        </p>
                        <div className="space-y-2">
                          {flaggedPosts.map((p) => (
                            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-zinc-400 text-[11px] mb-0.5">{p.user_name ?? 'Unknown'}</p>
                                <p className="text-white text-[13px] leading-relaxed line-clamp-3">
                                  {p.body ?? p.content ?? p.caption}
                                </p>
                              </div>
                              <button
                                onClick={() => dismiss('post', p.id)}
                                className="flex-shrink-0 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-700 rounded-lg px-2 py-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {flaggedComments.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Flagged Comments ({flaggedComments.length})
                        </p>
                        <div className="space-y-2">
                          {flaggedComments.map((c) => (
                            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-zinc-400 text-[11px] mb-0.5">{c.user_name ?? 'Unknown'}</p>
                                <p className="text-white text-[13px] leading-relaxed line-clamp-3">
                                  {c.content ?? c.body}
                                </p>
                              </div>
                              <button
                                onClick={() => dismiss('comment', c.id)}
                                className="flex-shrink-0 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-700 rounded-lg px-2 py-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Link
                  href="/admin"
                  className="block w-full text-center py-3 mt-2 rounded-xl bg-orange-500/15 text-orange-400 text-[13px] font-bold border border-orange-500/30"
                >
                  Open full admin panel
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user, profile, supabaseClient } = useAuth();
  const router = useRouter();

  // Fetch the current user's role for moderation access
  useEffect(() => {
    if (!user || !supabaseClient) return;
    supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setUserRole((data as { role?: string } | null)?.role ?? null));
  }, [user, supabaseClient]);

  const isModeratorUser = userRole === 'owner' || userRole === 'admin';

  const fetchPosts = useCallback(async () => {
    // Never block the feed on auth hydration — if session hangs (common on LAN / flaky mobile),
    // waiting here left isLoading=true forever with no posts. We fetch with user ?? null;
    // like/save/repost rows populate on the next run when user resolves.
    if (!supabaseClient) {
      setPosts(PLACEHOLDER_POSTS);
      setIsLoading(false);
      return;
    }
    try {
      // Pull extra rows — timeline includes repost copies (with banner + canonicalthread ids).
      const postsResult = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (postsResult.error) throw postsResult.error;

      const modBypass =
        userRole === 'owner' || userRole === 'admin';
      const viewerId = user?.id ?? null;

      const rawPosts: any[] = (postsResult.data ?? []).filter((p: any) => {
        if (p.hidden === true) return false;
        const st = String(p.moderation_status ?? 'approved').trim().toLowerCase();
        // `pending_no_engine` is a non-blocking state when moderation is not configured.
        // We still show these posts publicly; actual blocked content returns 422 and never gets inserted.
        if (!st || st === 'approved' || st === 'pending_no_engine') return true;
        if (modBypass) return true;
        if (viewerId && String(p.user_id) === String(viewerId)) return true;
        return false;
      });

      // Repost rows are not global: the reposter sees their RT, and each account they follow sees it
      // on their feed (broadcast-to-following only). Others keep seeing only the original post thread.
      const reposterIds = [
        ...new Set(
          rawPosts
            .filter((p: any) => p.repost_of_id)
            .map((p: any) => String(p.user_id))
        ),
      ];
      const followingByReposter = new Map<string, Set<string>>();
      if (reposterIds.length > 0) {
        const { data: followEdges } = await supabaseClient
          .from('follows')
          .select('follower_id,following_id')
          .in('follower_id', reposterIds);
        for (const row of followEdges ?? []) {
          const rid = String((row as { follower_id: string }).follower_id);
          const fid = String((row as { following_id: string }).following_id);
          if (!followingByReposter.has(rid)) followingByReposter.set(rid, new Set());
          followingByReposter.get(rid)!.add(fid);
        }
      }

      const feedSource = rawPosts.filter((p: any) => {
        if (!p.repost_of_id) return true;
        if (modBypass) return true;
        if (!viewerId) return false;
        const rid = String(p.user_id);
        if (rid === String(viewerId)) return true;
        return followingByReposter.get(rid)?.has(String(viewerId)) ?? false;
      });

      const postById = new Map<string, any>(
        rawPosts.map((p: any) => [String(p.id), p])
      );

      const [likesRows, savedRows, repostOriginalIdList] = user
        ? await Promise.all([
            fetchLikedPostIdRows(supabaseClient, user.id),
            fetchSavedPostIdRows(supabaseClient, user.id),
            fetchUserRepostedOriginalIds(supabaseClient, user.id),
          ])
        : [[], [], []];

      const canonicalIds = [
        ...new Set(feedSource.map((p: any) => String(p.repost_of_id ?? p.id))),
      ];
      const canonicalIdSet = new Set(canonicalIds);
      const uuidCanonicalIds = canonicalIds.filter((id) => isLikelyUuid(id));

      const likeCountMap: Record<string, number> = {};
      const commentCountMap: Record<string, number> = {};
      if (uuidCanonicalIds.length > 0) {
        const [likesAggRes, commentsAggRes] = await Promise.all([
          supabaseClient.from('post_likes').select('post_id').in('post_id', uuidCanonicalIds),
          supabaseClient.from('comments').select('post_id').in('post_id', uuidCanonicalIds),
        ]);
        if (!likesAggRes.error && likesAggRes.data) {
          for (const row of likesAggRes.data as { post_id?: string }[]) {
            const pid = row.post_id ? String(row.post_id) : '';
            if (!pid) continue;
            likeCountMap[pid] = (likeCountMap[pid] ?? 0) + 1;
          }
        }
        if (!commentsAggRes.error && commentsAggRes.data) {
          for (const row of commentsAggRes.data as { post_id?: string }[]) {
            const pid = row.post_id ? String(row.post_id) : '';
            if (!pid) continue;
            commentCountMap[pid] = (commentCountMap[pid] ?? 0) + 1;
          }
        }
      }

      const repostCountMap: Record<string, number> = {};
      if (canonicalIds.length > 0) {
        const { data: repRows, error: repCountErr } = await supabaseClient
          .from('posts')
          .select('repost_of_id')
          .in('repost_of_id', canonicalIds);
        if (!repCountErr && repRows) {
          for (const row of repRows as { repost_of_id?: string | null }[]) {
            const oid = row.repost_of_id;
            if (!oid) continue;
            const k = String(oid);
            repostCountMap[k] = (repostCountMap[k] ?? 0) + 1;
          }
        } else {
          // Query failed or repost_of_id unavailable — count repost rows in this fetch only
          // so counters don't collapse to 0 while the column/policy is broken.
          for (const row of rawPosts) {
            const oid = row.repost_of_id as string | null | undefined;
            if (!oid || !canonicalIdSet.has(String(oid))) continue;
            const k = String(oid);
            repostCountMap[k] = (repostCountMap[k] ?? 0) + 1;
          }
        }
      }

      const authorIds = new Set<string>();
      feedSource.forEach((p: any) => {
        if (p.user_id) authorIds.add(String(p.user_id));
        if (p.repost_of_id) {
          const orig = postById.get(String(p.repost_of_id));
          if (orig?.user_id) authorIds.add(String(orig.user_id));
        }
      });

      type AuthorRow = {
        name?: string | null;
        email?: string | null;
        username?: string | null;
        hide_display_name?: boolean | null;
        role?: string | null;
        is_verified?: boolean | null;
        avatar_url?: string | null;
      };
      const authorById: Record<string, AuthorRow> = {};
      if (authorIds.size > 0) {
        const { data: authorRows } = await supabaseClient
          .from('users')
          .select('*')
          .in('id', [...authorIds]);
        (authorRows ?? []).forEach((u: any) => {
          authorById[String(u.id)] = {
            name: u.name ?? null,
            email: u.email ?? null,
            username: u.username ?? null,
            hide_display_name: u.hide_display_name ?? null,
            role: u.role ?? null,
            is_verified: u.is_verified ?? null,
            avatar_url: u.avatar_url ?? null,
          };
        });
      }

      const clubFounderIds = new Set<string>();
      if (authorIds.size > 0) {
        const { data: founderRows, error: founderErr } = await supabaseClient
          .from('clubs')
          .select('owner_id')
          .in('owner_id', [...authorIds]);
        if (!founderErr && founderRows) {
          for (const row of founderRows as { owner_id?: string | null }[]) {
            if (row.owner_id != null && String(row.owner_id).trim()) {
              clubFounderIds.add(String(row.owner_id));
            }
          }
        }
      }

      const authorAvatarUrl = (postRow: any, au?: AuthorRow): string | undefined => {
        const fromUser = au?.avatar_url;
        if (fromUser != null && String(fromUser).trim()) return String(fromUser).trim();
        const fromPost = postRow?.avatar_url;
        if (fromPost != null && String(fromPost).trim()) return String(fromPost).trim();
        return undefined;
      };

      const authorDisplayName = (authorId: string | undefined | null, postRow: any): string => {
        const idStr = authorId ? String(authorId) : '';
        const au = idStr ? authorById[idStr] : undefined;
        const isSelf = viewerId != null && idStr !== '' && String(viewerId) === idStr;
        if (au) {
          const base = {
            id: idStr,
            name: au.name,
            email: au.email,
            username: au.username,
            hide_display_name: au.hide_display_name,
          };
          return isSelf ? resolveOwnProfileDisplayName(base) : resolvePublicDisplayName(base);
        }
        const pn = postRow?.user_name ?? postRow?.username;
        if (pn != null && String(pn).trim()) return String(pn).trim();
        return 'Rider';
      };

      const authorRole = (userId: string | undefined | null, postRow: any): string =>
        String(
          (userId ? authorById[String(userId)]?.role : null) ?? postRow?.role ?? 'user'
        );

      const likedIds = new Set(likesRows.map((r) => r.post_id));
      const savedIds = new Set(savedRows.map((r) => r.post_id));
      const repostedIds = new Set(repostOriginalIdList);

      const profileRole =
        profile && typeof (profile as { role?: unknown }).role === 'string'
          ? String((profile as { role: string }).role).trim()
          : '';

      const normalised = feedSource.map((p: any) => {
        const canonicalId = String(p.repost_of_id ?? p.id);
        const orig = p.repost_of_id ? postById.get(String(p.repost_of_id)) : null;
        const metricsRow = orig ?? p;

        const au = p.user_id ? authorById[String(p.user_id)] : undefined;
        const mergedAvatar = authorAvatarUrl(p, au);
        const viewerOwn =
          viewerId != null && String(p.user_id) === String(viewerId);
        const roleStr =
          viewerOwn && profileRole
            ? profileRole
            : authorRole(p.user_id, p);

        const original_user_name =
          p.repost_of_id && orig ? authorDisplayName(orig.user_id, orig) : null;

        // Repost rows: show the canonical/original caption & media (Twitter-style RT), not a cloned duplicate snapshot.
        const displaySrc = orig ?? p;
        const mergedBody = String(
          displaySrc.body ?? displaySrc.content ?? displaySrc.caption ?? ''
        );
        const mergedImageRaw =
          displaySrc.image_url != null && String(displaySrc.image_url).trim()
            ? displaySrc.image_url
            : p.image_url;
        const mergedImage =
          mergedImageRaw != null && String(mergedImageRaw).trim()
            ? ensureStoragePublicObjectUrl(String(mergedImageRaw)) || String(mergedImageRaw)
            : undefined;
        const mergedRig =
          (displaySrc.rig_model as string | null | undefined) ||
          (displaySrc.rig_name as string | null | undefined) ||
          (displaySrc.rig_specs as string | null | undefined);
        const mergedRigSpecs = (displaySrc.rig_specs as string | null | undefined) || undefined;

        const rc =
          repostCountMap[canonicalId] ??
          metricsRow.reposts_count ??
          metricsRow.reposts ??
          0;

        const lc =
          likeCountMap[canonicalId] ??
          metricsRow.likes_count ??
          metricsRow.likes ??
          0;
        const cc =
          commentCountMap[canonicalId] ??
          metricsRow.comments_count ??
          metricsRow.comments ??
          0;

        return {
          ...p,
          username: authorDisplayName(p.user_id, p),
          role: roleStr,
          club_founder_badge: clubFounderIds.has(String(p.user_id)),
          ...(mergedAvatar ? { avatar_url: mergedAvatar } : {}),
          verified: Boolean(p.verified ?? au?.is_verified ?? false),
          body: mergedBody,
          caption: mergedBody,
          image_url: mergedImage,
          rig_model: mergedRig || undefined,
          rig_specs: mergedRigSpecs,
          liked_by_me: likedIds.has(canonicalId),
          bookmarked_by_me: savedIds.has(canonicalId),
          reposted_by_me: repostedIds.has(canonicalId),
          likes_count: lc,
          comments_count: cc,
          reposts_count: rc,
          original_user_name,
        };
      });
      setPosts(
        normalised.length ? normalised.slice(0, 30) : PLACEHOLDER_POSTS
      );
    } catch {
      setPosts(PLACEHOLDER_POSTS);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, user, userRole, profile]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-black">

      {/* ── Sticky Top Header ─────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 py-3 max-w-app-shell mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-[10px] tracking-tight">SO</span>
            </div>
            <span className="font-black text-white text-base tracking-tight">
              SoCal<span className="text-orange-500">Offroaders</span>
            </span>
          </div>
          {isModeratorUser && <ModerationPanel />}
        </div>
      </header>

      {/* ── Main ──────────────────────────────────── */}
      <main className="max-w-app-shell mx-auto min-h-screen bg-black pb-24">
        <HomeStoriesRunsPager supabaseClient={supabaseClient} user={user} />

        {/* Feed — avoid Framer opacity-from-0 here (can stick invisible on some mobile Chrome builds). */}
        {isLoading ? (
          <div className="px-4 pt-4">
            <FeedSkeleton count={3} />
          </div>
        ) : (
          <div>
            <PullToRefreshFeed onRefresh={fetchPosts}>
              {posts.map((post, i) => (
                <RigPostCard key={post.id} post={post} index={i} />
              ))}
            </PullToRefreshFeed>
          </div>
        )}
      </main>

      {/* ── FAB ───────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => user ? setDrawerOpen(true) : router.push('/login')}
        aria-label="Create post"
        className="fixed bottom-[88px] right-4 z-40 w-[52px] h-[52px] bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
      >
        <Plus size={22} className="text-black" strokeWidth={2.5} />
      </motion.button>

      {/* ── New Post Drawer ────────────────────────── */}
      <NewPostDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onPosted={fetchPosts} />

      <BottomNav />
    </div>
  );
}
