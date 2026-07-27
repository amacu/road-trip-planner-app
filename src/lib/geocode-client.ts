import type { GeocodeResult } from "@/lib/integrations/geocode";

/**
 * Browser-side geocoding — calls our own /api/geocode Route Handler rather
 * than Nominatim directly. Nominatim's usage policy requires a real
 * User-Agent and disallows heavy client-side use, so the actual Nominatim
 * request happens server-side (src/lib/integrations/geocode.ts); this just
 * wraps the fetch to our proxy with AbortSignal support for debounced search.
 */
export async function geocode(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results: GeocodeResult[] };
  return data.results;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: GeocodeResult | null };
  return data.result;
}
