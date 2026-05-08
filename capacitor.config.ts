import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell loads the Next app from `server.url` (local dev or Vercel).
 * Set CAPACITOR_SERVER_URL for production builds (e.g. https://socaloffroaders.com/).
 * Production default below. Override with CAPACITOR_SERVER_URL only for local dev
 * (and use adb reverse if loading from a device).
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'https://socaloffroaders.com/';

const config: CapacitorConfig = {
  appId: 'com.socaloffroaders.app',
  appName: 'SoCalOffroaders',
  webDir: 'public',
  server: {
    url: serverUrl,
    androidScheme: 'https',
    cleartext: serverUrl.startsWith('http://'),
  },
  ios: {
    allowMixedContent: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
