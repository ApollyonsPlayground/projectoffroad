'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { isLimitedMediaDevice, resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';
import { useImagePicker } from '@/hooks/useImagePicker';
import {
  TRAIL_REPORT_CONDITION_OPTIONS,
  TRAIL_REPORT_DIFFICULTY_OPTIONS,
  TRAIL_REPORT_HAZARD_OPTIONS,
  TRAIL_REPORT_SURFACE_OPTIONS,
  type TrailReportCondition,
  type TrailReportDifficulty,
} from '@/lib/trails/trailReports';

type TrailReportFormDrawerProps = {
  open: boolean;
  trailId: string;
  trailName: string;
  runId?: string | null;
  runTitle?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

const MAX_PHOTOS = 4;

function toggleTag(current: string[], tag: string): string[] {
  return current.includes(tag)
    ? current.filter((item) => item !== tag)
    : [...current, tag];
}

function fileExt(file: File, fallback = 'jpg'): string {
  const ext = file.name.split('.').pop()?.trim().toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  return fallback;
}

export function TrailReportFormDrawer({
  open,
  trailId,
  trailName,
  runId = null,
  runTitle = null,
  onClose,
  onSubmitted,
}: TrailReportFormDrawerProps) {
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();
  const [conditionStatus, setConditionStatus] = useState<TrailReportCondition>('open');
  const [difficultyToday, setDifficultyToday] = useState<TrailReportDifficulty>('moderate');
  const [surfaceConditions, setSurfaceConditions] = useState<string[]>([]);
  const [hazards, setHazards] = useState<string[]>([]);
  const [hazardsNote, setHazardsNote] = useState('');
  const [weather, setWeather] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'submitting'>('idle');

  const sourceCopy = useMemo(() => {
    if (!runId) return 'Community trail report';
    return runTitle ? `Report from ${runTitle}` : 'Report from completed run';
  }, [runId, runTitle]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setConditionStatus('open');
    setDifficultyToday('moderate');
    setSurfaceConditions([]);
    setHazards([]);
    setHazardsNote('');
    setWeather('');
    setBody('');
    setPhotos([]);
    setProgress('idle');
  }, [open, runId, trailId]);

  const addPhotoFiles = (picked: File[]) => {
    if (picked.length === 0) return;
    const images = picked.filter((file) => file.type.startsWith('image/'));
    if (images.length !== picked.length) {
      showToast('Only image files can be attached to trail reports', 'info');
    }
    const tooLarge = images.find((file) => file.size > 10 * 1024 * 1024);
    if (tooLarge) {
      showToast('Each photo must be under 10 MB', 'error');
      return;
    }
    setPhotos((prev) => [...prev, ...images].slice(0, MAX_PHOTOS));
  };

  const { inputRef: fileInputRef, open: openPhotoPicker } = useImagePicker(
    (file) => addPhotoFiles([file]),
    (m) => showToast(m, 'error')
  );

  if (!open) return null;

  const uploadAndModeratePhotos = async (): Promise<string[]> => {
    if (!user || !supabaseClient) throw new Error('Sign in to report trail conditions');
    if (photos.length === 0) return [];

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Session expired. Sign in again.');

    const uploadedPaths: string[] = [];
    const publicUrls: string[] = [];

    try {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        let uploadBlob: Blob = file;
        let contentType = file.type || 'image/jpeg';
        let ext = fileExt(file);
        if (isLimitedMediaDevice() && file.type.startsWith('image/')) {
          uploadBlob = await resizeImageFileToJpegBlob(file, 2000, 0.88);
          contentType = 'image/jpeg';
          ext = 'jpg';
        }

        const path = `${user.id}/trail-reports/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('post-images')
          .upload(path, uploadBlob, { upsert: true, contentType });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);

        const { data: urlData } = supabaseClient.storage.from('post-images').getPublicUrl(path);
        const publicUrl = urlData.publicUrl;
        const scanRes = await fetch('/api/moderation/scan-image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: publicUrl }),
        });
        const scanJson = await scanRes.json().catch(() => ({}));
        if (scanRes.status === 422) {
          throw new Error(
            scanJson.reason === 'nudity_detected'
              ? 'One photo was blocked by the safety filter.'
              : scanJson.reason === 'gore_detected'
                ? 'One photo was blocked for graphic content.'
                : 'One photo did not pass the safety check.'
          );
        }
        if (!scanRes.ok) {
          throw new Error(scanJson.error ?? 'Photo safety check failed');
        }
        publicUrls.push(publicUrl);
      }
      return publicUrls;
    } catch (err) {
      if (uploadedPaths.length > 0) {
        await supabaseClient.storage.from('post-images').remove(uploadedPaths);
      }
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!user || !supabaseClient) {
      showToast('Sign in to report trail conditions', 'info');
      return;
    }
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      showToast('Add a short note about the trail', 'info');
      return;
    }
    if (trimmedBody.length > 4000) {
      showToast('Keep the report under 4000 characters', 'info');
      return;
    }

    setSubmitting(true);
    setProgress(photos.length > 0 ? 'uploading' : 'submitting');
    try {
      const photoUrls = await uploadAndModeratePhotos();
      setProgress('submitting');
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired. Sign in again.');

      const res = await fetch('/api/trail-reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trail_id: trailId,
          trail_name: trailName,
          run_id: runId,
          condition_status: conditionStatus,
          difficulty_today: difficultyToday,
          surface_conditions: surfaceConditions,
          hazards,
          hazards_note: hazardsNote.trim() || null,
          weather: weather.trim() || null,
          body: trimmedBody,
          photo_urls: photoUrls,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not submit trail report');
      showToast('Trail report posted to the feed', 'success');
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit trail report';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setProgress('idle');
    }
  };

  const renderTagButton = (tag: string, selected: boolean, onClick: () => void) => (
    <button
      key={tag}
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full border text-[12px] font-bold transition-colors ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      {selected ? <Check size={12} className="inline mr-1" /> : null}
      {tag}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[9995] max-w-app-shell mx-auto" role="dialog" aria-modal="true" aria-label="Trail report">
      <button
        type="button"
        className="absolute inset-0 w-full bg-background/80 backdrop-blur-sm"
        aria-label="Close trail report"
        onClick={() => (submitting ? null : onClose())}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[92dvh] bg-muted border border-border rounded-t-2xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-primary">{sourceCopy}</p>
            <h2 className="text-[17px] font-black text-foreground truncate">Report {trailName}</h2>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Trail status today
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TRAIL_REPORT_CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setConditionStatus(option.id)}
                  className={`py-2.5 px-3 rounded-xl border text-[13px] font-bold ${
                    conditionStatus === option.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Difficulty today
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TRAIL_REPORT_DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDifficultyToday(option.id)}
                  className={`py-2.5 px-3 rounded-xl border text-[13px] font-bold ${
                    difficultyToday === option.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Surface conditions
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAIL_REPORT_SURFACE_OPTIONS.map((tag) =>
                renderTagButton(tag, surfaceConditions.includes(tag), () =>
                  setSurfaceConditions((prev) => toggleTag(prev, tag))
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Hazards
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TRAIL_REPORT_HAZARD_OPTIONS.map((tag) =>
                renderTagButton(tag, hazards.includes(tag), () =>
                  setHazards((prev) => toggleTag(prev, tag))
                )
              )}
            </div>
            <input
              value={hazardsNote}
              onChange={(e) => setHazardsNote(e.target.value)}
              maxLength={240}
              placeholder="Extra hazard note, if needed"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Weather
            </label>
            <input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              maxLength={120}
              placeholder="Clear, windy, rain, snow, hot, etc."
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Notes
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What should the next group know about the trail today?"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-y min-h-[120px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Photos
              </label>
              <span className="text-[11px] text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            {photos.length > 0 ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="rounded-xl border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground truncate">
                    {photo.name}
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addPhotoFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => void openPhotoPicker()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border text-[14px] font-bold text-foreground disabled:opacity-50"
            >
              <Camera size={16} />
              Add photos
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !body.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-[14px] disabled:bg-zinc-800 disabled:text-muted-foreground"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {progress === 'uploading'
              ? 'Checking photos…'
              : progress === 'submitting'
                ? 'Posting report…'
                : 'Post trail report'}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Reports publish to the trail page and community feed.
          </p>
        </div>
      </div>
    </div>
  );
}
