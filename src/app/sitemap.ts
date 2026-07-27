import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/register`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
