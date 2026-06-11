import type { SupabaseClient } from '@supabase/supabase-js';

export type GuestUpgradeResult = {
  upgraded: boolean;
  already_member?: boolean;
};

export async function upgradeGuestToMember(
  supabase: SupabaseClient
): Promise<GuestUpgradeResult> {
  const { data, error } = await supabase.rpc('upgrade_guest_to_member');
  if (error) throw new Error(error.message);
  return (data ?? { upgraded: false }) as GuestUpgradeResult;
}
