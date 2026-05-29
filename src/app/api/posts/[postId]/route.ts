import { disabledLegacyApiResponse } from '@/lib/api/security';

export async function GET() {
  return disabledLegacyApiResponse();
}

export async function DELETE() {
  return disabledLegacyApiResponse();
}
