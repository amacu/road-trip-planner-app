import "server-only";

// Free geocoding via Nominatim (OpenStreetMap). Only ever called from
// Route Handlers (src/app/api/geocode/**) — Nominatim's usage policy
// requires a real User-Agent identifying the app and disallows high-volume
// client-side (browser) use, so this must run server-side, not be called
// directly from components. See src/lib/geocode-client.ts for the
// browser-side wrapper that hits our own /api/geocode instead.
const NOMINATIM_USER_AGENT = "RoadTripPlanner/1.0 (contact: app-support)";

export type GeocodeResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  countryCode: string | null;
};

// Tiny in-memory cache so repeated searches (e.g. re-opening the same trip,
// or two users searching the same city) don't all hit Nominatim's strict
// ~1 req/sec rate limit. Fine as a per-instance cache — no cross-request
// consistency requirements for geocoding results.
const searchCache = new Map<string, { at: number; results: GeocodeResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const cached = searchCache.get(q);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results;
  }

  const coordMatch = q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const rawCoord = q.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  const coordPair = coordMatch ?? rawCoord;
  if (coordPair) {
    const lat = parseFloat(coordPair[1]);
    const lng = parseFloat(coordPair[2]);
    const rev = await reverseGeocode(lat, lng);
    const results = [
      rev ?? {
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address: "",
        lat,
        lng,
        countryCode: null,
      },
    ];
    searchCache.set(q, { at: Date.now(), results });
    return results;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    name?: string;
    address?: { country_code?: string };
  }>;
  const results = data.map((r) => ({
    name: r.name || r.display_name.split(",")[0],
    address: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    countryCode: r.address?.country_code?.toUpperCase() ?? null,
  }));
  searchCache.set(q, { at: Date.now(), results });
  return results;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!res.ok) return null;
  const r = (await res.json()) as {
    display_name?: string;
    name?: string;
    address?: { country_code?: string };
  };
  if (!r?.display_name) return null;
  return {
    name: r.name || r.display_name.split(",")[0],
    address: r.display_name,
    lat,
    lng,
    countryCode: r.address?.country_code?.toUpperCase() ?? null,
  };
}
