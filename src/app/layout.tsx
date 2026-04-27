import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewTransitions } from "@/components/ViewTransitions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SoCal Off-Roaders | Community App",
  description: "Southern California's premier off-road community - Find trails, join runs, connect with clubs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SoCal Off-Roaders",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`bg-black ${inter.variable}`}>
      <body className="antialiased bg-black text-foreground min-h-screen font-sans">
        <AuthProvider>
          <ViewTransitions>
            {children}
          </ViewTransitions>
        </AuthProvider>
      </body>
    </html>
  );
}
