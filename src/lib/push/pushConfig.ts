/** Server-side remote push delivery. Keep false until FCM/APNs credentials are configured. */
export function isPushSendEnabled(): boolean {
  return process.env.PUSH_SEND_ENABLED?.trim().toLowerCase() === 'true';
}

/** Client-side token registration on native shell (does not send notifications). */
export function isPushRegistrationEnabled(): boolean {
  if (typeof process.env.NEXT_PUBLIC_PUSH_REGISTER === 'string') {
    return process.env.NEXT_PUBLIC_PUSH_REGISTER.trim().toLowerCase() !== 'false';
  }
  return true;
}
