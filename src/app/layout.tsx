import type { Metadata } from "next";

import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/500.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "RoadTrip Planner — Plan multi-day drives with stops & maps",
  description:
    "Plan multi-day road trips with day-by-day stops, an interactive map, and one-click Google Maps navigation.",
  icons: {
    icon: [
      {
        url: "/logo-box.png?v=2",
        type: "image/png",
        sizes: "160x160",
      },
    ],
    shortcut: "/logo-box.png?v=2",
    apple: [{ url: "/logo-box.png?v=2", sizes: "160x160" }],
  },
  openGraph: {
    title: "RoadTrip Planner",
    description:
      "Plan multi-day road trips with day-by-day stops, an interactive map, and one-click Google Maps navigation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF8F1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
