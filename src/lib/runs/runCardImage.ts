import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';

export const RUN_CARD_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80';

/** Run card / story ring image: flyer → club banner (official runs) → trail photo → fallback. */
export function resolveRunCardImage(options: {
  flyerImage?: string | null;
  runSource?: string | null;
  clubBannerImage?: string | null;
  trailPhotoUrl?: string | null;
}): string {
  const flyerRaw =
    options.flyerImage != null && String(options.flyerImage).trim()
      ? String(options.flyerImage).trim()
      : '';
  const flyerUrl = flyerRaw ? ensureStoragePublicObjectUrl(flyerRaw) || flyerRaw : '';

  const clubBannerRaw =
    options.runSource === 'club_official' &&
    options.clubBannerImage &&
    String(options.clubBannerImage).trim()
      ? String(options.clubBannerImage).trim()
      : '';
  const clubBanner = clubBannerRaw
    ? ensureStoragePublicObjectUrl(clubBannerRaw) || clubBannerRaw
    : '';

  const trailRaw =
    options.trailPhotoUrl && String(options.trailPhotoUrl).trim()
      ? String(options.trailPhotoUrl).trim()
      : '';
  const trailPhoto = trailRaw ? ensureStoragePublicObjectUrl(trailRaw) || trailRaw : '';

  return flyerUrl || clubBanner || trailPhoto || RUN_CARD_FALLBACK_IMG;
}
