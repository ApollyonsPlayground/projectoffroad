import { disabledLegacyApiResponse } from '@/lib/api/security';

export async function POST() {
  return disabledLegacyApiResponse();
}
