import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeSync } from "@/components/ThemeSync";
import { NativeSafeAreaSync } from "@/components/NativeSafeAreaSync";
import { ViewTransitions } from "@/components/ViewTransitions";
import { ToastProvider } from "@/components/Toast";
import { AdminLauncher } from "@/components/admin/AdminLauncher";
import DisclaimerModal from "@/components/DisclaimerModal";
import { DevUpdatesModal } from "@/components/dev/DevUpdatesModal";
import { SignedInAppRedirect } from "@/components/SignedInAppRedirect";
import { AppBootGate } from "@/components/boot/AppBootGate";
import { WelcomeNicknameToast } from "@/components/onboarding/WelcomeNicknameToast";
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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-ui-preset="midnight-orange"
      className={`bg-background ${inter.variable}`}
    >
      <body className="antialiased bg-background text-foreground min-h-[100dvh] font-sans">
        <AuthProvider>
          <AppBootGate />
          <NativeSafeAreaSync />
          <ThemeSync />
          <ToastProvider>
            <ViewTransitions>
              <DesktopNavbar />
              {children}
            </ViewTransitions>
            <DisclaimerModal />
            <SignedInAppRedirect />
            <DevUpdatesModal />
            <WelcomeNicknameToast />
            <AdminLauncher />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
