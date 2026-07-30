"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import type { DayRouteMetric } from "@/features/fuel/lib/fuel-plan";
import type { TripDayPlain } from "@/features/trips/lib/trip-view-model";
import {
  buildRouteSegments,
  fallbackRouteForStops,
  fetchDrivingRoute,
  fetchWalkingRoute,
  routeSignature,
  walkingRouteForStops,
} from "@/lib/integrations/routing";

type CachedRouteMetric = DayRouteMetric & { signature: string };

function stationaryRoute(stop: { lat: number; lng: number }) {
  return {
    path: [[stop.lat, stop.lng] as [number, number]],
    distanceKm: 0,
    durationMin: 0,
    legs: [],
  };
}

export function useRouteMetrics(days: TripDayPlain[]) {
  const [cache, setCache] = useState<Record<string, CachedRouteMetric>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    const controller = new AbortController();
    const signatures = new Map(
      days.map((day) => [day.id, routeSignature(day.stops)]),
    );

    startTransition(() => {
      setCache((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([dayId, metric]) => signatures.get(dayId) === metric.signature,
          ),
        ),
      );
    });

    for (const day of days) {
      if (day.stops.length < 2) continue;
      const signature = signatures.get(day.id)!;
      if (cacheRef.current[day.id]?.signature === signature) continue;
      const segments = buildRouteSegments(day.stops);

      Promise.all(
        segments.map((segment) => {
          const pair = [segment.from, segment.to];
          if (
            segment.from.lat === segment.to.lat &&
            segment.from.lng === segment.to.lng
          ) {
            return Promise.resolve(stationaryRoute(segment.to));
          }
          return segment.mode === "walking"
            ? fetchWalkingRoute(pair, controller.signal)
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
            (sum, route, index) =>
              sum +
              (segments[index]?.mode === "driving" ? route.distanceKm : 0),
            0,
          );
          const driveMin = validRoutes.reduce(
            (sum, route, index) =>
              sum +
              (segments[index]?.mode === "driving" ? route.durationMin : 0),
            0,
          );
          const legs = Array.from({ length: day.stops.length - 1 }, () => ({
            distanceKm: 0,
            durationMin: 0,
            returnDurationMin: 0,
          }));
          validRoutes.forEach((route, index) => {
            const segment = segments[index];
            const leg = legs[segment.logicalLegIndex];
            if (segment.isReturnToCar) {
              leg.returnDurationMin =
                (leg.returnDurationMin ?? 0) + route.durationMin;
              return;
            }
            leg.distanceKm += route.distanceKm;
            leg.durationMin += route.durationMin;
          });
          startTransition(() => {
            setCache((current) => ({
              ...current,
              [day.id]: {
                signature,
                distanceKm,
                driveMin,
                path,
                legs,
              },
            }));
          });
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
      const segments = buildRouteSegments(day.stops);
      const fallbackRoutes = segments.map((segment) =>
        segment.mode === "walking"
          ? walkingRouteForStops([segment.from, segment.to])
          : fallbackRouteForStops([segment.from, segment.to]),
      );
      const fallback = fallbackRoutes.every(Boolean)
        ? {
            distanceKm: fallbackRoutes.reduce(
              (sum, route, index) =>
                sum +
                (segments[index]?.mode === "driving"
                  ? (route?.distanceKm ?? 0)
                  : 0),
              0,
            ),
            durationMin: fallbackRoutes.reduce(
              (sum, route, index) =>
                sum +
                (segments[index]?.mode === "driving"
                  ? (route?.durationMin ?? 0)
                  : 0),
              0,
            ),
            path: fallbackRoutes.flatMap((route, index) =>
              index === 0 ? (route?.path ?? []) : (route?.path.slice(1) ?? []),
            ),
            legs: (() => {
              const legs = Array.from(
                { length: Math.max(0, day.stops.length - 1) },
                () => ({
                  distanceKm: 0,
                  durationMin: 0,
                  returnDurationMin: 0,
                }),
              );
              fallbackRoutes.forEach((route, index) => {
                if (!route) return;
                const segment = segments[index];
                const leg = legs[segment.logicalLegIndex];
                if (segment.isReturnToCar) {
                  leg.returnDurationMin =
                    (leg.returnDurationMin ?? 0) + route.durationMin;
                  return;
                }
                leg.distanceKm += route.distanceKm;
                leg.durationMin += route.durationMin;
              });
              return legs;
            })(),
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
