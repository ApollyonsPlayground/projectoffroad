import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewTransitions } from "@/components/ViewTransitions";

export const metadata: Metadata = {
  title: "SoCal Offroaders | Community App",
  description: "Southern California Offroad Community - Find trails, join runs, connect with clubs",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <script src="https://cdn.tailwindcss.com"></script>
      <body className="antialiased bg-black text-white">
        <AuthProvider>
          <ViewTransitions>
            {children}
          </ViewTransitions>
        </AuthProvider>
      </body>
    </html>
  );
}