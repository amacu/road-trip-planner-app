import "server-only";

// Points of interest via the Overpass API (OpenStreetMap data) — the same
// free, keyless OSM ecosystem as geocode.ts/routing.ts. Only ever called
// from Route Handlers (src/app/api/geocode/poi) — see poi-client.ts for the
// browser-side wrapper.
const OVERPASS_USER_AGENT = "RoadTripPlanner/1.0 (contact: app-support)";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export type PoiCategory = "food" | "attraction" | "fuel" | "lodging" | "coffee";

export type PoiResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: PoiCategory;
};

// Maps each category to the OSM tags that represent it. Kept small and
// curated (not "every tag under the sun") so results stay uncluttered at
// map zoom levels a user would realistically be planning a stop at.
const CATEGORY_TAGS: Record<PoiCategory, string[]> = {
  food: ["amenity=restaurant", "amenity=fast_food"],
  coffee: ["amenity=cafe"],
  attraction: ["tourism=attraction", "tourism=viewpoint", "tourism=museum"],
  fuel: ["amenity=fuel"],
  lodging: ["tourism=hotel", "tourism=guest_house"],
};

function tagToCategory(tags: Record<string, string>): PoiCategory | null {
  for (const [category, matchers] of Object.entries(CATEGORY_TAGS) as Array<
    [PoiCategory, string[]]
  >) {
    for (const matcher of matchers) {
      const [key, value] = matcher.split("=");
      if (tags[key] === value) return category;
    }
  }
  return null;
}

// Tiny in-memory cache keyed by a rounded bbox — panning/zooming a few
// pixels re-requests the same tile otherwise, and Overpass's public
// instance is shared/rate-limited infrastructure.
const poiCache = new Map<string, { at: number; results: PoiResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export type PoiBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

/** Caps how large a viewport's worth of POIs we'll fetch in one go. */
const MAX_BBOX_DEGREES = 0.15;

export async function fetchPois(bounds: PoiBounds): Promise<PoiResult[]> {
  const { south, west, north, east } = bounds;
  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east) ||
    north <= south ||
    east <= west
  ) {
    return [];
  }

  // Refuse to fan out a city-sized (or larger) query to Overpass — the
  // browser only ever asks for this once zoomed in far enough anyway (see
  // map-view.tsx), but a defensive cap here keeps a misbehaving caller from
  // hammering the shared public Overpass instance.
  if (north - south > MAX_BBOX_DEGREES || east - west > MAX_BBOX_DEGREES) {
    return [];
  }

  const cacheKey = [south, west, north, east]
    .map((n) => n.toFixed(3))
    .join(",");
  const cached = poiCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results;
  }

  const tagFilters = Object.values(CATEGORY_TAGS)
    .flat()
    .map(
      (tag) =>
        `node[${tag.replace("=", '="').replace(/$/, '"')}](${south},${west},${north},${east});`,
    )
    .join("\n");

  const query = `[out:json][timeout:15];(${tagFilters});out center 80;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    elements?: Array<{
      id: number;
      lat?: number;
      lon?: number;
      tags?: Record<string, string>;
    }>;
  };

  const results: PoiResult[] = [];
  for (const el of data.elements ?? []) {
    if (typeof el.lat !== "number" || typeof el.lon !== "number") continue;
    const tags = el.tags ?? {};
    const category = tagToCategory(tags);
    const name = tags.name;
    if (!category || !name) continue;

    results.push({
      id: `osm-${el.id}`,
      name,
      lat: el.lat,
      lng: el.lon,
      category,
    });
  }

  poiCache.set(cacheKey, { at: Date.now(), results });
  return results;
}
