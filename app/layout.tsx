import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./professional.css";
import {viewingModeBootstrap} from "@/lib/viewing-mode";
import {languageBootstrap} from "@/lib/language-bootstrap";
import InitialLanguageText from "@/components/initial-language-text";

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
    <html lang="en" suppressHydrationWarning>
      <head><script id="nightjar-language" dangerouslySetInnerHTML={{__html:languageBootstrap}}/><script id="nightjar-viewing-mode" dangerouslySetInnerHTML={{__html:viewingModeBootstrap}}/></head>
      <body className="antialiased"><a className="skip-link" href="#main-content"><InitialLanguageText message="startup.skip"/></a>{children}</body>
    </html>
  );
}
