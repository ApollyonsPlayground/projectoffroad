export type OnboardingProfile = {
  is_guest?: boolean | null;
  onboarding_completed_at?: string | null;
  theme_prompt_seen_at?: string | null;
};

export function needsOnboardingWizard(profile: OnboardingProfile | null | undefined): boolean {
  if (!profile || profile.is_guest) return false;
  return !profile.onboarding_completed_at;
}

export function needsThemePrompt(profile: OnboardingProfile | null | undefined): boolean {
  if (!profile || profile.is_guest) return false;
  if (!profile.onboarding_completed_at) return false;
  return !profile.theme_prompt_seen_at;
}

export const ONBOARDING_ALLOWED_PREFIXES = ['/onboarding', '/terms', '/privacy', '/child-safety'];

export function isOnboardingAllowedPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '/').replace(/\/+$/, '') || '/';
  return ONBOARDING_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
