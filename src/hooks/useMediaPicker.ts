'use client';

import { useRef, type ChangeEvent } from 'react';
import { openMediaPicker, isUserCancelledMediaPick } from '@/lib/media/pickNativeMedia';

export type UseMediaPickerOptions = {
  /** When true, native picker offers Record Video and library videos. */
  allowVideo?: boolean;
  onError?: (message: string) => void;
};

export function useMediaPicker(
  onFile: (file: File) => void | Promise<void>,
  options?: UseMediaPickerOptions
) {
  const { allowVideo = false, onError } = options ?? {};
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void onFile(file);
  };

  const open = async () => {
    try {
      await openMediaPicker(onFile, () => inputRef.current?.click(), allowVideo);
    } catch (err) {
      if (isUserCancelledMediaPick(err)) return;
      onError?.(err instanceof Error ? err.message : 'Could not open camera');
    }
  };

  return { inputRef, handleInputChange, open };
}
