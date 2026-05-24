/** Platform owner/admin (`public.users.role`), not club officers. */
export function isPlatformStaffRole(role: string | null | undefined): boolean {
  const r = String(role ?? '').trim().toLowerCase();
  return r === 'owner' || r === 'admin';
}
