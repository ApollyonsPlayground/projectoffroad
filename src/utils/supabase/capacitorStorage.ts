import { Preferences } from '@capacitor/preferences';

/**
 * Supabase Auth storage adapter for Capacitor native.
 * Ensures PKCE verifier + session survive across app ↔ system browser boundary.
 */
export const capacitorAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};

