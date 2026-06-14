/** Public URL for a club-garage storage object path. */
export function publicClubGarageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}/storage/v1/object/public/club-garage/${encodeURI(path)}`;
}
