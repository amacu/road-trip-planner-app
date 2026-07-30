import { haversineKm } from "@/lib/geo";

export type RouteStop = {
  lat: number;
  lng: number;
  travelMode?: "driving" | "walking";
  itemType?: "stop" | "activity";
};

export type RouteSegment = {
  from: RouteStop;
  to: RouteStop;
  mode: "driving" | "walking";
  /** Index in the original stop-to-stop leg list that owns this segment. */
  logicalLegIndex: number;
  isReturnToCar: boolean;
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
        `${s.lat.toFixed(6)},${s.lng.toFixed(6)},${s.travelMode ?? "driving"},${s.itemType ?? "stop"}`,
    )
    .join("|");

/**
 * Expands the visible itinerary into physical travel segments. Walking
 * activities form one excursion from the last place where the car was left;
 * before the next drive (or at the end of the day), the route returns there.
 */
export function buildRouteSegments(stops: RouteStop[]): RouteSegment[] {
  if (stops.length < 2) return [];

  const segments: RouteSegment[] = [];
  let carAnchor = stops[0];
  let currentPosition = stops[0];

  for (let index = 1; index < stops.length; index++) {
    const destination = stops[index];
    const isWalkingActivity =
      destination.itemType === "activity" &&
      destination.travelMode === "walking";

    if (isWalkingActivity) {
      segments.push({
        from: currentPosition,
        to: destination,
        mode: "walking",
        logicalLegIndex: index - 1,
        isReturnToCar: false,
      });
      currentPosition = destination;
      continue;
    }

    if (currentPosition !== carAnchor) {
      segments.push({
        from: currentPosition,
        to: carAnchor,
        mode: "walking",
        logicalLegIndex: index - 1,
        isReturnToCar: true,
      });
      currentPosition = carAnchor;
    }

    const mode = destination.travelMode ?? "driving";
    segments.push({
      from: currentPosition,
      to: destination,
      mode,
      logicalLegIndex: index - 1,
      isReturnToCar: false,
    });
    currentPosition = destination;
    if (mode === "driving") carAnchor = destination;
  }

  if (currentPosition !== carAnchor) {
    segments.push({
      from: currentPosition,
      to: carAnchor,
      mode: "walking",
      logicalLegIndex: stops.length - 2,
      isReturnToCar: true,
    });
  }

  return segments;
}

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
  return fetchOsrmRoute(stops, signal, "driving");
}

/**
 * Uses the OpenStreetMap.de OSRM foot profile so walking paths follow the
 * pedestrian network instead of cutting across buildings in a straight line.
 */
export async function fetchWalkingRoute(
  stops: RouteStop[],
  signal: AbortSignal,
): Promise<DrivingRoute | null> {
  try {
    const walkingRoute = await fetchOsrmRoute(stops, signal, "walking");
    if (walkingRoute) return walkingRoute;
  } catch (error) {
    if (signal.aborted) throw error;
  }

  // The public foot router can occasionally be rate-limited or unavailable.
  // A road-following shape is still more useful than a straight line; retain
  // walking-speed estimates while using the driving router's geometry.
  const roadRoute = await fetchOsrmRoute(stops, signal, "driving");
  if (!roadRoute) return null;

  return {
    ...roadRoute,
    durationMin: Math.max(1, Math.round((roadRoute.distanceKm / 5) * 60)),
    legs: roadRoute.legs.map((leg) => ({
      ...leg,
      durationMin: Math.max(1, Math.round((leg.distanceKm / 5) * 60)),
    })),
  };
}

async function fetchOsrmRoute(
  stops: RouteStop[],
  signal: AbortSignal,
  profile: "driving" | "walking",
): Promise<DrivingRoute | null> {
  if (stops.length < 2) return null;

  const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const params = new URLSearchParams({
    profile,
    coordinates,
    routingVersion: "2",
  });

  const res = await fetch(`/api/routing?${params.toString()}`, {
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
