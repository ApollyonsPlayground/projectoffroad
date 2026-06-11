import {
  Camera,
  CameraErrorCode,
  MediaType,
  MediaTypeSelection,
  type MediaResult,
} from '@capacitor/camera';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';
import { requestMediaActionSheet } from '@/lib/media/mediaActionSheetState';
import { pickFileViaHtmlInput } from '@/lib/media/htmlFilePick';
import {
  isNativeCameraPluginAvailable,
  isPluginUnimplementedError,
} from '@/lib/media/isNativeCameraAvailable';

const CANCEL_CODES = new Set<string>([
  CameraErrorCode.TakePhotoCancelled,
  CameraErrorCode.RecordVideoCancelled,
  CameraErrorCode.ChooseMediaCancelled,
  CameraErrorCode.EditPhotoCancelled,
]);

export function isUserCancelledMediaPick(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (CANCEL_CODES.has(code)) return true;
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /cancel/i.test(msg) || /User denied/i.test(msg);
}

/** @deprecated Use isUserCancelledMediaPick */
export const isUserCancelledImagePick = isUserCancelledMediaPick;

function mimeAndExtForFormat(format: string, isVideo: boolean): { mime: string; ext: string } {
  const fmt = format.toLowerCase();
  if (isVideo) {
    if (fmt === 'mov') return { mime: 'video/quicktime', ext: 'mov' };
    if (fmt === 'webm') return { mime: 'video/webm', ext: 'webm' };
    return { mime: 'video/mp4', ext: 'mp4' };
  }
  if (fmt === 'png') return { mime: 'image/png', ext: 'png' };
  if (fmt === 'webp') return { mime: 'image/webp', ext: 'webp' };
  if (fmt === 'gif') return { mime: 'image/gif', ext: 'gif' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function finalizePickedFile(file: File): Promise<File> {
  if (file.type.startsWith('video/')) return file;
  try {
    const resized = await resizeImageFileToJpegBlob(file, 2048, 0.88);
    return new File([resized], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function mediaResultToFile(result: MediaResult): Promise<File> {
  const path = result.webPath;
  if (!path) throw new Error('No media returned');

  const isVideo = result.type === MediaType.Video;
  const { mime, ext } = mimeAndExtForFormat(
    result.metadata?.format ?? (isVideo ? 'mp4' : 'jpeg'),
    isVideo
  );
  const response = await fetch(path);
  const blob = await response.blob();
  const prefix = isVideo ? 'video' : 'photo';
  const raw = new File([blob], `${prefix}-${Date.now()}.${ext}`, { type: blob.type || mime });
  return finalizePickedFile(raw);
}

async function withCameraOrHtmlFallback<T>(
  cameraCall: () => Promise<T>,
  htmlPick: () => Promise<File | null>,
  mapHtml: (file: File) => Promise<T>
): Promise<T | null> {
  if (isNativeCameraPluginAvailable()) {
    try {
      return await cameraCall();
    } catch (err) {
      if (isUserCancelledMediaPick(err)) throw err;
      if (!isPluginUnimplementedError(err)) throw err;
    }
  }

  const file = await htmlPick();
  if (!file) return null;
  return mapHtml(file);
}

export async function takePhotoFile(): Promise<File | null> {
  return withCameraOrHtmlFallback(
    async () => {
      const result = await Camera.takePhoto({ quality: 90, includeMetadata: true });
      return mediaResultToFile(result);
    },
    () => pickFileViaHtmlInput({ accept: 'image/*', capture: 'environment' }),
    finalizePickedFile
  );
}

export async function recordVideoFile(): Promise<File | null> {
  return withCameraOrHtmlFallback(
    async () => {
      const result = await Camera.recordVideo({
        saveToGallery: false,
        isPersistent: true,
        includeMetadata: true,
      });
      return mediaResultToFile(result);
    },
    () => pickFileViaHtmlInput({ accept: 'video/*', capture: 'environment' }),
    (file) => Promise.resolve(file)
  );
}

export async function chooseGalleryFile(
  mediaType: 'photo' | 'video' | 'all'
): Promise<File | null> {
  const selection =
    mediaType === 'photo'
      ? MediaTypeSelection.Photo
      : mediaType === 'video'
        ? MediaTypeSelection.Video
        : MediaTypeSelection.All;

  const accept =
    mediaType === 'photo'
      ? 'image/*'
      : mediaType === 'video'
        ? 'video/*'
        : 'image/*,video/*';

  return withCameraOrHtmlFallback(
    async () => {
      const { results } = await Camera.chooseFromGallery({
        mediaType: selection,
        allowMultipleSelection: false,
        includeMetadata: true,
      });
      const item = results[0];
      if (!item) return null;
      return mediaResultToFile(item);
    },
    () => pickFileViaHtmlInput({ accept }),
    finalizePickedFile
  );
}

/** Native camera / gallery picker. Returns null when the user cancels. */
export async function pickNativeMediaFile(allowVideo: boolean): Promise<File | null> {
  if (!isCapacitorNative()) return null;

  const choice = await requestMediaActionSheet(allowVideo);
  if (choice === 'cancel') return null;
  try {
    if (choice === 'photo') return await takePhotoFile();
    if (choice === 'video') return await recordVideoFile();
    return await chooseGalleryFile(allowVideo ? 'all' : 'photo');
  } catch (err) {
    if (isUserCancelledMediaPick(err)) return null;
    throw err;
  }
}

export async function pickNativeImageFile(): Promise<File | null> {
  return pickNativeMediaFile(false);
}

export async function openMediaPicker(
  onFile: (file: File) => void | Promise<void>,
  fallbackOpenFileInput: () => void,
  allowVideo = false
): Promise<void> {
  if (!isCapacitorNative()) {
    fallbackOpenFileInput();
    return;
  }

  const file = await pickNativeMediaFile(allowVideo);
  if (file) await onFile(file);
}

export async function openImagePicker(
  onFile: (file: File) => void | Promise<void>,
  fallbackOpenFileInput: () => void
): Promise<void> {
  await openMediaPicker(onFile, fallbackOpenFileInput, false);
}
