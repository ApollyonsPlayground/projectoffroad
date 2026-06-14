/** Server-side remote push delivery (admin test, run-reminder cron). */
export function isPushSendEnabled(): boolean {
  return process.env.PUSH_SEND_ENABLED?.trim().toLowerCase() === 'true';
}

/**
 * Client-side FCM/APNs token registration on native sign-in and Settings.
 * Default: on. Set NEXT_PUBLIC_PUSH_REGISTER=false on Vercel to disable (e.g. during a bad build).
 *
 * Note: local run reminders (@capacitor/local-notifications) do not use this flag.
 */
export function isPushRegistrationEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PUSH_REGISTER?.trim().toLowerCase();
  if (raw === 'false') return false;
  return true;
}
