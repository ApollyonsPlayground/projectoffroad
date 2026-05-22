import type { User } from '@supabase/supabase-js';

export type OAuthProviderId = 'google' | 'apple';

export function userHasIdentity(user: User | null | undefined, provider: OAuthProviderId): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === provider));
}

export function userLinkedProviderLabels(user: User | null | undefined): string {
  const parts: string[] = [];
  if (userHasIdentity(user, 'google')) parts.push('Google');
  if (userHasIdentity(user, 'apple')) parts.push('Apple');
  if (parts.length === 0 && user?.email) return 'Signed in';
  return parts.length ? parts.join(' · ') : '—';
}

export function userIdentityCount(user: User | null | undefined): number {
  return user?.identities?.length ?? 0;
}
