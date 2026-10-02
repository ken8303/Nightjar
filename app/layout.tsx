import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./professional.css";
import PwaSupport from "@/components/pwa-support";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b1115" };

export const metadata: Metadata = {
  title: "Nightjar — Stargazing planner",
  description: "Find your next clear night with weather, a sky atlas, observing events and photography tools.",
  other: {
    "codex-preview": "development",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Nightjar", statusBarStyle: "black-translucent" },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><a className="skip-link" href="#main-content">Skip to planner</a>{children}<PwaSupport /></body>
    </html>
  );
}
