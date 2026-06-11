export type MediaActionChoice = 'photo' | 'video' | 'gallery' | 'cancel';

type PendingRequest = {
  allowVideo: boolean;
  resolve: (choice: MediaActionChoice) => void;
};

let pending: PendingRequest | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeMediaActionSheet(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMediaActionSheetPending(): PendingRequest | null {
  return pending;
}

export function requestMediaActionSheet(allowVideo: boolean): Promise<MediaActionChoice> {
  return new Promise((resolve) => {
    pending = { allowVideo, resolve };
    notify();
  });
}

export function resolveMediaActionSheet(choice: MediaActionChoice) {
  const current = pending;
  pending = null;
  notify();
  current?.resolve(choice);
}
