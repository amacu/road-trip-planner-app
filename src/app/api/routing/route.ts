import { NextResponse } from "next/server";

import { haversineKm } from "@/lib/geo";

type ValhallaResponse = {
  trip?: {
    summary?: { length?: number; time?: number };
    legs?: Array<{
      shape?: string;
      summary?: { length?: number; time?: number };
    }>;
  };
};

type RoutingResult = {
  code: "Ok";
  routes: Array<{
    distance: number;
    duration: number;
    estimated?: boolean;
    geometry: { coordinates: Array<[number, number]> };
    legs: Array<{ distance: number; duration: number }>;
  }>;
};

const MAX_CONCURRENT_REQUESTS = 3;
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ROUTE_CACHE_ENTRIES = 200;
let activeRequests = 0;
const waitingRequests: Array<() => void> = [];
const routeCache = new Map<
  string,
  { expiresAt: number; result: RoutingResult }
>();
const inFlightRoutes = new Map<string, Promise<RoutingResult>>();

function estimatedRoute(
  profile: "driving" | "walking",
  locations: Array<{ lat: number; lng: number }>,
): RoutingResult {
  const speedKmh = profile === "walking" ? 5 : 70;
  const legs = locations.slice(1).map((location, index) => {
    const distanceKm = haversineKm(locations[index], location);
    return {
      distance: distanceKm * 1000,
      duration: distanceKm === 0 ? 0 : (distanceKm / speedKmh) * 3600,
    };
  });

  return {
    code: "Ok",
    routes: [
      {
        distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
        duration: legs.reduce((sum, leg) => sum + leg.duration, 0),
        estimated: true,
        geometry: {
          coordinates: locations.map(({ lat, lng }) => [lng, lat]),
        },
        legs,
      },
    ],
  };
}

async function withRoutingSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => waitingRequests.push(resolve));
  }

  activeRequests += 1;
  try {
    return await task();
  } finally {
    activeRequests -= 1;
    waitingRequests.shift()?.();
  }
}

function decodePolyline6(shape: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < shape.length) {
    const changes: number[] = [];
    for (let coordinate = 0; coordinate < 2; coordinate += 1) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = shape.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index <= shape.length);
      changes.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    lat += changes[0];
    lng += changes[1];
    points.push([lng / 1e6, lat / 1e6]);
  }

  return points;
}

async function requestRoute(
  cacheKey: string,
  profile: "driving" | "walking",
  locations: Array<{ lat: number; lng: number }>,
): Promise<RoutingResult> {
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) routeCache.delete(cacheKey);

  const existingRequest = inFlightRoutes.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = withRoutingSlot(async () => {
    const response = await fetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Client-Id": "roadtrip-planner",
      },
      body: JSON.stringify({
        locations: locations.map(({ lat, lng }) => ({ lat, lon: lng })),
        costing: profile === "walking" ? "pedestrian" : "auto",
        directions_options: { units: "kilometers" },
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    if (response.status === 400) {
      return estimatedRoute(profile, locations);
    }
    if (!response.ok) {
      throw new Error(`Valhalla returned ${response.status}.`);
    }
    const data = (await response.json()) as ValhallaResponse;
    const legs = data.trip?.legs ?? [];
    const geometry = legs.flatMap((leg, index) => {
      const points = leg.shape ? decodePolyline6(leg.shape) : [];
      return index === 0 ? points : points.slice(1);
    });
    const distanceKm = data.trip?.summary?.length;
    const durationSeconds = data.trip?.summary?.time;

    if (
      geometry.length < 2 ||
      typeof distanceKm !== "number" ||
      typeof durationSeconds !== "number"
    ) {
      throw new Error("Valhalla returned an incomplete route.");
    }

    const straightDistanceKm = locations
      .slice(1)
      .reduce(
        (total, location, index) =>
          total + haversineKm(locations[index], location),
        0,
      );
    const walkingSpeedKmh =
      durationSeconds > 0 ? distanceKm / (durationSeconds / 3600) : Infinity;
    const implausibleWalkingRoute =
      profile === "walking" &&
      (walkingSpeedKmh > 15 ||
        distanceKm > Math.max(straightDistanceKm * 4, straightDistanceKm + 10));
    const resolvedDistanceKm = implausibleWalkingRoute
      ? straightDistanceKm
      : distanceKm;
    const resolvedDurationSeconds = implausibleWalkingRoute
      ? Math.max(60, Math.round((straightDistanceKm / 5) * 3600))
      : durationSeconds;
    const resolvedGeometry = implausibleWalkingRoute
      ? locations.map(({ lat, lng }) => [lng, lat] as [number, number])
      : geometry;

    const result: RoutingResult = {
      code: "Ok",
      routes: [
        {
          distance: resolvedDistanceKm * 1000,
          duration: resolvedDurationSeconds,
          estimated: implausibleWalkingRoute,
          geometry: { coordinates: resolvedGeometry },
          legs: implausibleWalkingRoute
            ? [
                {
                  distance: resolvedDistanceKm * 1000,
                  duration: resolvedDurationSeconds,
                },
              ]
            : legs.map((leg) => ({
                distance: (leg.summary?.length ?? 0) * 1000,
                duration: leg.summary?.time ?? 0,
              })),
        },
      ],
    };

    if (routeCache.size >= MAX_ROUTE_CACHE_ENTRIES) {
      routeCache.delete(routeCache.keys().next().value!);
    }
    routeCache.set(cacheKey, {
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
      result,
    });
    return result;
  });

  inFlightRoutes.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inFlightRoutes.delete(cacheKey);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profile = url.searchParams.get("profile");
  const coordinates = url.searchParams.get("coordinates") ?? "";

  if (profile !== "driving" && profile !== "walking") {
    return NextResponse.json(
      { error: "Invalid routing profile." },
      { status: 400 },
    );
  }

  const locations = coordinates.split(";").map((point) => {
    const [lngText, latText, ...extra] = point.split(",");
    return {
      lng: Number(lngText),
      lat: Number(latText),
      valid:
        extra.length === 0 &&
        Number.isFinite(Number(lngText)) &&
        Number.isFinite(Number(latText)) &&
        Number(lngText) >= -180 &&
        Number(lngText) <= 180 &&
        Number(latText) >= -90 &&
        Number(latText) <= 90,
    };
  });

  if (
    locations.length < 2 ||
    locations.length > 50 ||
    locations.some((location) => !location.valid)
  ) {
    return NextResponse.json(
      { error: "Invalid coordinates." },
      { status: 400 },
    );
  }

  try {
    const result = await requestRoute(
      `v2:${profile}:${coordinates}`,
      profile,
      locations,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("Routing request failed:", error);
    return NextResponse.json(
      { error: "Routing service unavailable." },
      { status: 502 },
    );
  }
}
