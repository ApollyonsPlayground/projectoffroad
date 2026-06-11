'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Film, ImageIcon } from 'lucide-react';
import {
  getMediaActionSheetPending,
  resolveMediaActionSheet,
  subscribeMediaActionSheet,
  type MediaActionChoice,
} from '@/lib/media/mediaActionSheetState';

function useMediaActionSheetPending() {
  return useSyncExternalStore(
    subscribeMediaActionSheet,
    getMediaActionSheetPending,
    () => null
  );
}

export function MediaActionSheetHost() {
  const pending = useMediaActionSheetPending();
  const open = pending !== null;

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !pending) return null;

  const choose = (choice: MediaActionChoice) => resolveMediaActionSheet(choice);

  const ui = (
    <div className="fixed inset-0 z-[19990] flex flex-col justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => choose('cancel')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-action-sheet-title"
        className="relative max-w-app-shell mx-auto w-full bg-muted border border-border rounded-t-2xl shadow-xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <h2 id="media-action-sheet-title" className="text-[15px] font-bold text-foreground text-center">
            Add media
          </h2>
        </div>
        <div className="p-2">
          <button
            type="button"
            onClick={() => choose('photo')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-foreground hover:bg-background/60 transition-colors"
          >
            <Camera size={20} className="text-primary shrink-0" aria-hidden />
            <span className="text-[15px] font-medium">Take Photo</span>
          </button>
          {pending.allowVideo ? (
            <button
              type="button"
              onClick={() => choose('video')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-foreground hover:bg-background/60 transition-colors"
            >
              <Film size={20} className="text-primary shrink-0" aria-hidden />
              <span className="text-[15px] font-medium">Record Video</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => choose('gallery')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-foreground hover:bg-background/60 transition-colors"
          >
            <ImageIcon size={20} className="text-primary shrink-0" aria-hidden />
            <span className="text-[15px] font-medium">Choose from Library</span>
          </button>
          <button
            type="button"
            onClick={() => choose('cancel')}
            className="w-full mt-1 px-4 py-3.5 rounded-xl text-center text-[15px] font-semibold text-muted-foreground hover:bg-background/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
