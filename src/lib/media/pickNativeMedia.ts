import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import {
  Camera,
  CameraErrorCode,
  MediaType,
  MediaTypeSelection,
  type MediaResult,
} from '@capacitor/camera';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';

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

  if (isVideo) return raw;

  try {
    const resized = await resizeImageFileToJpegBlob(raw, 2048, 0.88);
    return new File([resized], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } catch {
    return raw;
  }
}

export async function takePhotoFile(): Promise<File> {
  const result = await Camera.takePhoto({ quality: 90, includeMetadata: true });
  return mediaResultToFile(result);
}

export async function recordVideoFile(): Promise<File> {
  const result = await Camera.recordVideo({
    saveToGallery: false,
    isPersistent: true,
    includeMetadata: true,
  });
  return mediaResultToFile(result);
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

  const { results } = await Camera.chooseFromGallery({
    mediaType: selection,
    allowMultipleSelection: false,
    includeMetadata: true,
  });

  const item = results[0];
  if (!item) return null;
  return mediaResultToFile(item);
}

async function showMediaActionSheet(
  allowVideo: boolean
): Promise<'photo' | 'video' | 'gallery' | 'cancel'> {
  const options: { title: string; style?: ActionSheetButtonStyle }[] = [{ title: 'Take Photo' }];
  if (allowVideo) options.push({ title: 'Record Video' });
  options.push({ title: 'Choose from Library' });
  options.push({ title: 'Cancel', style: ActionSheetButtonStyle.Cancel });

  const { index } = await ActionSheet.showActions({ title: 'Add media', options });
  if (index === undefined || index < 0) return 'cancel';

  const cancelIdx = options.length - 1;
  if (index === cancelIdx) return 'cancel';
  if (index === 0) return 'photo';
  if (allowVideo && index === 1) return 'video';
  return 'gallery';
}

/** Native camera / gallery picker. Returns null when the user cancels. */
export async function pickNativeMediaFile(allowVideo: boolean): Promise<File | null> {
  if (!isCapacitorNative()) return null;

  const choice = await showMediaActionSheet(allowVideo);
  if (choice === 'cancel') return null;
  if (choice === 'photo') return takePhotoFile();
  if (choice === 'video') return recordVideoFile();
  return chooseGalleryFile(allowVideo ? 'all' : 'photo');
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
