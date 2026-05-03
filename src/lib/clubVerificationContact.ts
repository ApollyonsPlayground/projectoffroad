/**
 * Optional funnel so club leaders know how to reach you for the verified badge.
 * Set NEXT_PUBLIC_CLUB_VERIFICATION_EMAIL in .env.local (same address you monitor).
 */
export function getClubVerificationEmail(): string | null {
  const raw = process.env.NEXT_PUBLIC_CLUB_VERIFICATION_EMAIL?.trim();
  return raw || null;
}

export function buildClubVerificationMailto(opts?: {
  clubName?: string;
  clubSlug?: string;
  /** Extra line from the requester */
  note?: string;
}): string | null {
  const to = getClubVerificationEmail();
  if (!to) return null;
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
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
