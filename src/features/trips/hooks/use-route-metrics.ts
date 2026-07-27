"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DayRouteMetric } from "@/features/fuel/lib/fuel-plan";
import type { TripDayPlain } from "@/features/trips/lib/trip-view-model";
import {
  fallbackRouteForStops,
  fetchDrivingRoute,
  routeSignature,
  walkingRouteForStops,
} from "@/lib/integrations/routing";

type CachedRouteMetric = DayRouteMetric & { signature: string };

export function useRouteMetrics(days: TripDayPlain[]) {
  const [cache, setCache] = useState<Record<string, CachedRouteMetric>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    const controller = new AbortController();
    const signatures = new Map(
      days.map((day) => [day.id, routeSignature(day.stops)]),
    );

    setCache((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([dayId, metric]) => signatures.get(dayId) === metric.signature,
        ),
      ),
    );

    for (const day of days) {
      if (day.stops.length < 2) continue;
      const signature = signatures.get(day.id)!;
      if (cacheRef.current[day.id]?.signature === signature) continue;

      Promise.all(
        day.stops.slice(1).map((destination, index) => {
          const pair = [day.stops[index], destination];
          return destination.travelMode === "walking"
            ? Promise.resolve(walkingRouteForStops(pair))
            : fetchDrivingRoute(pair, controller.signal);
        }),
      )
        .then((routes) => {
          if (controller.signal.aborted || routes.some((route) => !route)) {
            return;
          }
          const validRoutes = routes.filter(
            (route): route is NonNullable<typeof route> => route !== null,
          );
          const path = validRoutes.flatMap((route, index) =>
            index === 0 ? route.path : route.path.slice(1),
          );
          const distanceKm = validRoutes.reduce(
            (sum, route) => sum + route.distanceKm,
            0,
          );
          const driveMin = validRoutes.reduce(
            (sum, route) => sum + route.durationMin,
            0,
          );
          setCache((current) => ({
            ...current,
            [day.id]: {
              signature,
              distanceKm,
              driveMin,
              path,
              legs: validRoutes.flatMap((route) => route.legs),
            },
          }));
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.warn("Could not fetch driving route", error);
          }
        });
    }

    return () => controller.abort();
  }, [days]);

  return useMemo(() => {
    const result: Record<string, DayRouteMetric> = {};
    for (const day of days) {
      const fallbackLegs = day.stops
        .slice(1)
        .map((destination, index) =>
          destination.travelMode === "walking"
            ? walkingRouteForStops([day.stops[index], destination])
            : fallbackRouteForStops([day.stops[index], destination]),
        );
      const fallback = fallbackLegs.every(Boolean)
        ? {
            distanceKm: fallbackLegs.reduce(
              (sum, route) => sum + (route?.distanceKm ?? 0),
              0,
            ),
            durationMin: fallbackLegs.reduce(
              (sum, route) => sum + (route?.durationMin ?? 0),
              0,
            ),
            path: fallbackLegs.flatMap((route, index) =>
              index === 0 ? (route?.path ?? []) : (route?.path.slice(1) ?? []),
            ),
            legs: fallbackLegs.flatMap((route) => route?.legs ?? []),
          }
        : null;
      result[day.id] =
        cache[day.id] ??
        (fallback
          ? {
              distanceKm: fallback.distanceKm,
              driveMin: fallback.durationMin,
              path: fallback.path,
              legs: fallback.legs,
            }
          : { distanceKm: 0, driveMin: 0, path: [], legs: [] });
    }
    return result;
  }, [cache, days]);
}
