import { CameraErrorCode } from '@capacitor/camera';

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

/**
 * Opens the platform file/camera picker via a hidden `<input type="file">`.
 * Reliable in Capacitor WebView on Android/iOS without native plugin bridges.
 */
export async function openMediaPicker(
  _onFile: (file: File) => void | Promise<void>,
  openFileInput: () => void
): Promise<void> {
  openFileInput();
}

export async function openImagePicker(
  onFile: (file: File) => void | Promise<void>,
  openFileInput: () => void
): Promise<void> {
  await openMediaPicker(onFile, openFileInput);
}
