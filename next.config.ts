import type { NextConfig } from "next";
import withPWA from "next-pwa";

/** LAN hostname(s) for `npm run dev:lan` — HMR/dev assets are cross-origin from IP vs localhost. */
const allowedDevOrigins =
  process.env.NODE_ENV === "development"
    ? [
        "192.168.1.73",
        ...(process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
          .map((h) => h.trim())
          .filter(Boolean) ?? []),
      ]
    : undefined;

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  /** Hide the corner dev / route indicator in development. */
  devIndicators: false,
  turbopack: {},
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default pwaConfig(nextConfig);
