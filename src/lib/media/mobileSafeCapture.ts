/**
 * iOS WKWebView / Safari often terminates when decoding camera-sized video frames
 * into full-resolution canvases (OOM). Keep thumbnails modest for previews + moderation.
 */

export function isLimitedMediaDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPhone / iPad / iPod, plus common Capacitor WebView UA fragments
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Mobile\/.*Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) return true;
  return false;
}

/** Max longer edge for decoded video frames (preview / thumbs / moderation samples). */
const VIDEO_FRAME_MAX_EDGE = 720;

const VIDEO_PROBE_MS = 22_000;
const VIDEO_SEEK_MS = 14_000;

export async function captureVideoFrameScaledDataUrl(
  file: File,
  timeSeconds: number,
  options?: { maxEdge?: number; quality?: number }
): Promise<string> {
  const maxEdge = options?.maxEdge ?? VIDEO_FRAME_MAX_EDGE;
  const quality = options?.quality ?? 0.82;

  const blobUrl = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', 'true');
  v.setAttribute('webkit-playsinline', 'true');

  try {
    v.src = blobUrl;

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('video metadata timeout')), VIDEO_PROBE_MS);
      const ok = () => {
        window.clearTimeout(timer);
        resolve();
      };
      const fail = () => {
        window.clearTimeout(timer);
        reject(new Error('could not read video'));
      };
      v.addEventListener('loadedmetadata', ok, { once: true });
      v.addEventListener('error', fail, { once: true });
    });

    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    const safeUpper = Math.max(0, dur - 0.08);
    const target = Math.max(0, Math.min(timeSeconds, safeUpper));

    v.currentTime = target;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('seek timeout')), VIDEO_SEEK_MS);
      const ok = () => {
        window.clearTimeout(timer);
        resolve();
      };
      const fail = () => {
        window.clearTimeout(timer);
        reject(new Error('could not seek video'));
      };
      v.addEventListener('seeked', ok, { once: true });
      v.addEventListener('error', fail, { once: true });
    });

    const vw = Math.max(1, v.videoWidth || 1);
    const vh = Math.max(1, v.videoHeight || 1);
    const scale = Math.min(1, maxEdge / Math.max(vw, vh));
    const tw = Math.max(1, Math.round(vw * scale));
    const th = Math.max(1, Math.round(vh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(v, 0, 0, tw, th);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(blobUrl);
  }
}

/** Resize large camera photos before upload (stories / fragile mobile browsers). */
export async function resizeImageFileToJpegBlob(
  file: File,
  maxEdge = 1600,
  quality = 0.88
): Promise<Blob> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('could not decode image'));
      img.src = blobUrl;
    });

    const iw = Math.max(1, img.naturalWidth || img.width || 1);
    const ih = Math.max(1, img.naturalHeight || img.height || 1);
    const scale = Math.min(1, maxEdge / Math.max(iw, ih));
    const tw = Math.max(1, Math.round(iw * scale));
    const th = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(img, 0, 0, tw, th);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality);
    });
    return blob;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
