import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// Routing (OSRM) and geocoding (Nominatim) are called directly from the
// browser — see src/lib/integrations/{routing,geocode}.ts. Map tiles come
// from CARTO's basemaps CDN (img-src below) — see map-view.tsx's L.tileLayer.
const connectSrc = [
  "'self'",
  supabaseUrl,
  "https://nominatim.openstreetmap.org",
  "https://router.project-osrm.org",
].filter(Boolean);

// Next.js dev mode (Fast Refresh / webpack eval-source-maps) requires
// 'unsafe-eval' to run at all — without it, every client script silently
// fails and the app looks "dead" (no navigation, no interactivity). Only
// tighten to a stricter script-src in production.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.basemaps.cartocdn.com${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  `connect-src ${connectSrc.join(" ")}${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
