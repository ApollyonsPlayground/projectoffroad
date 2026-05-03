import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell loads the Next app from `server.url` (local dev or Vercel).
 * Set CAPACITOR_SERVER_URL for production builds (https://your-app.vercel.app/).
 * Default http://localhost:3000 matches `npm run dev` for `npx cap run ios|android`.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'socaloffroaders.app',
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
