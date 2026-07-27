export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeUrl(configured);

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) return normalizeUrl(vercelProductionUrl);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeUrl(vercelUrl);

  return "http://localhost:3000";
}

function normalizeUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}
