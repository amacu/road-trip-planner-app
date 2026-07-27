import type { PoiBounds, PoiResult } from "@/lib/integrations/poi";

/**
 * Browser-side POI lookup — calls our own /api/geocode/poi Route Handler
 * rather than Overpass directly. See src/lib/integrations/poi.ts for the
 * server-side Overpass query and rate-limit/caching rationale.
 */
export async function fetchPois(
  bounds: PoiBounds,
  signal?: AbortSignal,
): Promise<PoiResult[]> {
  const params = new URLSearchParams({
    south: String(bounds.south),
    west: String(bounds.west),
    north: String(bounds.north),
    east: String(bounds.east),
  });

  const res = await fetch(`/api/geocode/poi?${params.toString()}`, {
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results: PoiResult[] };
  return data.results;
}
