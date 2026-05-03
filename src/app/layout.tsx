import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewTransitions } from "@/components/ViewTransitions";
import { ToastProvider } from "@/components/Toast";
import ClientGlobalSOS from "@/components/ClientGlobalSOS";
import { AdminLauncher } from "@/components/admin/AdminLauncher";
import { LaunchGate } from "@/components/launch/LaunchGate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SoCalOffroaders | Community App",
  description:
    "Southern California off-road community — trails, runs, and clubs. Official companion for socaloffroaders.com.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SoCalOffroaders",
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
    <html lang="en" data-scroll-behavior="smooth" className={`bg-black ${inter.variable}`}>
      <body className="antialiased bg-black text-foreground min-h-screen font-sans">
        <AuthProvider>
          <ToastProvider>
            <ViewTransitions>
              <LaunchGate>{children}</LaunchGate>
            </ViewTransitions>
            <ClientGlobalSOS />
            <AdminLauncher />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
