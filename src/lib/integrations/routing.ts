import { haversineKm } from "@/lib/geo";

export type RouteStop = {
  lat: number;
  lng: number;
  travelMode?: "driving" | "walking";
};

export type DrivingRoute = {
  path: Array<[number, number]>;
  distanceKm: number;
  durationMin: number;
  legs: RouteLeg[];
};

export type RouteLeg = {
  distanceKm: number;
  durationMin: number;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    legs?: Array<{
      distance?: number;
      duration?: number;
    }>;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

export const routeSignature = (stops: RouteStop[]) =>
  stops
    .map(
      (s) =>
        `${s.lat.toFixed(6)},${s.lng.toFixed(6)},${s.travelMode ?? "driving"}`,
    )
    .join("|");

export const straightRouteForStops = (stops: RouteStop[]) =>
  stops.map((s) => [s.lat, s.lng] as [number, number]);

export function fallbackRouteForStops(stops: RouteStop[]): DrivingRoute | null {
  if (stops.length < 2) return null;

  let distanceKm = 0;
  const legs: RouteLeg[] = [];
  for (let i = 1; i < stops.length; i++) {
    const legDistanceKm = haversineKm(stops[i - 1], stops[i]);
    distanceKm += legDistanceKm;
    legs.push({
      distanceKm: legDistanceKm,
      durationMin: Math.max(1, Math.round((legDistanceKm / 70) * 60)),
    });
  }

  return {
    path: straightRouteForStops(stops),
    distanceKm,
    durationMin: Math.round((distanceKm / 70) * 60),
    legs,
  };
}

export function walkingRouteForStops(stops: RouteStop[]): DrivingRoute | null {
  const route = fallbackRouteForStops(stops);
  if (!route) return null;
  return {
    ...route,
    durationMin: Math.max(1, Math.round((route.distanceKm / 5) * 60)),
    legs: route.legs.map((leg) => ({
      ...leg,
      durationMin: Math.max(1, Math.round((leg.distanceKm / 5) * 60)),
    })),
  };
}

/**
 * Calls the free, keyless OSRM public demo routing server. Suitable for low
 * traffic; consider a paid provider or self-hosted OSRM before scaling.
 */
export async function fetchDrivingRoute(
  stops: RouteStop[],
  signal: AbortSignal,
): Promise<DrivingRoute | null> {
  if (stops.length < 2) return null;

  const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}`,
  );
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as OsrmRouteResponse;
  const route = data.routes?.[0];
  const coordinatesFromRoute = route?.geometry?.coordinates;
  if (
    data.code !== "Ok" ||
    !coordinatesFromRoute?.length ||
    typeof route?.distance !== "number" ||
    typeof route?.duration !== "number"
  ) {
    return null;
  }

  return {
    path: coordinatesFromRoute.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    legs:
      route.legs?.map((leg) => ({
        distanceKm: (leg.distance ?? 0) / 1000,
        durationMin: Math.max(1, Math.round((leg.duration ?? 0) / 60)),
      })) ??
      fallbackRouteForStops(stops)?.legs ??
      [],
  };
}
