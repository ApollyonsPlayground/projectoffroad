/** User-facing message when OAuth sign-in or link fails due to an existing account. */
export function formatOAuthAuthError(
  message: string | undefined,
  options?: { code?: string; provider?: 'google' | 'apple'; linking?: boolean }
): string {
  const raw = message?.trim() ?? '';
  const lower = raw.toLowerCase();
  const code = options?.code?.toLowerCase() ?? '';
  const providerLabel = options?.provider === 'apple' ? 'Apple' : options?.provider === 'google' ? 'Google' : 'that provider';

  if (
    code === 'email_exists' ||
    lower.includes('already registered') ||
    lower.includes('user already registered') ||
    lower.includes('email address is already') ||
    lower.includes('email already exists')
  ) {
    return options?.linking
      ? `This ${providerLabel} account is already on another profile. Sign in with that account first, or use the email you originally signed up with.`
      : `An account with this email already exists. Sign in with the method you used before (not a second sign-up). In Settings you can connect Google and Apple on one profile.`;
  }

  if (
    lower.includes('already linked') ||
    lower.includes('identity is already linked') ||
    lower.includes('linked to another user')
  ) {
    return `This ${providerLabel} sign-in is already tied to a SoCal Offroaders account. Use that sign-in method, or open Settings → Connected accounts while signed in to link providers on one profile.`;
  }

  if (lower.includes('manual linking') || lower.includes('linking is disabled')) {
    return 'Connecting Google and Apple on one account is not enabled in Supabase yet. Ask an admin to turn on Manual linking under Authentication settings.';
  }

  if (lower.includes('single identity') || lower.includes('must have at least 1 identity')) {
    return 'You need at least one sign-in method on your account.';
  }

  return raw || 'Sign-in failed. Please try again.';
}
