import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

/**
 * Club verification requests. Override with NEXT_PUBLIC_CLUB_VERIFICATION_EMAIL if needed;
 * otherwise defaults to the primary site inbox.
 */
export function getClubVerificationEmail(): string {
  const raw = process.env.NEXT_PUBLIC_CLUB_VERIFICATION_EMAIL?.trim();
  return raw || SITE_SUPPORT_EMAIL;
}

export function buildClubVerificationMailto(opts?: {
  clubName?: string;
  clubSlug?: string;
  /** Extra line from the requester */
  note?: string;
}): string {
  const to = getClubVerificationEmail();
  const subject = opts?.clubName
    ? `Club verification: ${opts.clubName}`
    : 'Club verification request — SoCalOffroaders';
  const lines = [
    'Hi,',
    '',
    opts?.clubName && `Club name: ${opts.clubName}`,
    opts?.clubSlug && `Slug / URL: ${opts.clubSlug}`,
    opts?.note,
    '',
    'Thanks,',
  ].filter(Boolean) as string[];
  const body = lines.join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
