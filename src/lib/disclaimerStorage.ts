export const DISCLAIMER_STORAGE_KEY = 'project_offroad_disclaimer_v1';

/** Fired on window after the legal disclaimer is accepted (signed-out flow). */
export const DISCLAIMER_ACCEPTED_EVENT = 'socal-disclaimer-accepted';

export function markDisclaimerAccepted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
  } catch {
    /* private mode */
  }
}

export function isDisclaimerAccepted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
