import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeSync } from "@/components/ThemeSync";
import { ViewTransitions } from "@/components/ViewTransitions";
import { ToastProvider } from "@/components/Toast";
import ClientGlobalSOS from "@/components/ClientGlobalSOS";
import { AdminLauncher } from "@/components/admin/AdminLauncher";
import DisclaimerModal from "@/components/DisclaimerModal";
import { DesktopNavbar } from "@/components/DesktopNavbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://socaloffroaders.com",
  ),
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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`bg-background ${inter.variable}`}>
      <body className="antialiased bg-background text-foreground min-h-screen font-sans">
        <AuthProvider>
          <ThemeSync />
          <ToastProvider>
            <ViewTransitions>
              <DesktopNavbar />
              {children}
            </ViewTransitions>
            <DisclaimerModal />
            <ClientGlobalSOS />
            <AdminLauncher />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
