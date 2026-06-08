'use client';

import { useMediaPicker, type UseMediaPickerOptions } from '@/hooks/useMediaPicker';

/** Image-only native picker (profile avatar, club logos, etc.). */
export function useImagePicker(
  onFile: (file: File) => void | Promise<void>,
  onError?: UseMediaPickerOptions['onError']
) {
  return useMediaPicker(onFile, { allowVideo: false, onError });
}
