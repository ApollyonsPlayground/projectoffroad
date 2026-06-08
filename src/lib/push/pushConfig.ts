/** Server-side remote push delivery. Keep false until FCM/APNs credentials are configured. */
export function isPushSendEnabled(): boolean {
  return process.env.PUSH_SEND_ENABLED?.trim().toLowerCase() === 'true';
}

/** Client-side token registration — off by default until push is stable (was crashing on allow). */
export function isPushRegistrationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PUSH_REGISTER?.trim().toLowerCase() === 'true';
}
