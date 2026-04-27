import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewTransitions } from "@/components/ViewTransitions";

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
    <html lang="en" className="bg-black">
      <body className="antialiased bg-black text-foreground min-h-screen">
        <AuthProvider>
          <ViewTransitions>
            {children}
          </ViewTransitions>
        </AuthProvider>
      </body>
    </html>
  );
}
