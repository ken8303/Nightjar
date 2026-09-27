import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nightjar — Stargazing planner",
  description: "Find your next clear night with weather, a sky atlas, observing events and photography tools.",
  other: {
    "codex-preview": "development",
  },
  icons: {
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
