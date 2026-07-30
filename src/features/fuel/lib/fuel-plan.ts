import { iso1A2Code } from "@rapideditor/country-coder";

import type {
  StopPoint,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import {
  getFuelCountryByName,
  getFuelCountryFromText,
  type FuelCountryPrice,
  type FuelTypeKey,
} from "@/lib/integrations/fuel-prices";
import { haversineKm } from "@/lib/geo";

export type DayRouteMetric = {
  distanceKm: number;
  driveMin: number;
  path: Array<[number, number]>;
  legs: Array<{
    distanceKm: number;
    durationMin: number;
    returnDurationMin?: number;
  }>;
};

export type FuelRouteSegment = {
  id: string;
  country: string;
  code: string;
  distanceKm: number;
  startKm: number;
  endKm: number;
  pricePln: number;
  usageL: number;
  costPln: number;
};

export type FuelPlan = {
  timelineSegments: FuelRouteSegment[];
  totalDistance: number;
  totalUsage: number;
  totalCost: number;
};

function fuelCountryForCode(
  code: string | null,
  prices: FuelCountryPrice[],
): FuelCountryPrice | null {
  if (!code) return null;
  const normalizedCode = code.toUpperCase();
  return (
    prices.find((entry) => entry.code.toUpperCase() === normalizedCode) ?? {
      code: normalizedCode,
      country: normalizedCode,
      aliases: [normalizedCode.toLowerCase()],
      pricesPlnPerLiter: { petrol95: null, diesel: null, lpg: null },
    }
  );
}

function countryAtRoutePoint(
  point: [number, number],
  prices: FuelCountryPrice[],
) {
  const [lat, lng] = point;
  return fuelCountryForCode(iso1A2Code([lng, lat]), prices);
}

export function getVehicleFuelTypeKey(
  vehicle?: VehiclePlain | null,
): FuelTypeKey | null {
  if (!vehicle) return null;
  if (vehicle.fuelType === "Diesel") return "diesel";
  if (vehicle.fuelType === "Electric") return null;
  if (vehicle.fuelType.toLowerCase() === "lpg") return "lpg";
  return "petrol95";
}

export function getDefaultFuelPricePln(
  prices: FuelCountryPrice[],
  vehicle?: VehiclePlain | null,
) {
  const fuelType = getVehicleFuelTypeKey(vehicle);
  if (!fuelType) return 0;
  const poland = getFuelCountryByName(prices, "Poland");
  const fallback = prices.find(
    (entry) => entry.pricesPlnPerLiter[fuelType] !== null,
  );

  return (
    poland?.pricesPlnPerLiter[fuelType] ??
    fallback?.pricesPlnPerLiter[fuelType] ??
    0
  );
}

export function estimateFuelCostPln(
  distanceKm: number,
  prices: FuelCountryPrice[],
  vehicle?: VehiclePlain | null,
) {
  if (!vehicle) return 0;
  return Math.round(
    ((distanceKm * vehicle.consumption) / 100) *
      getDefaultFuelPricePln(prices, vehicle),
  );
}

function getCountryFuelPricePln(
  country: FuelCountryPrice,
  fuelType: FuelTypeKey | null,
  prices: FuelCountryPrice[],
  vehicle: VehiclePlain,
) {
  if (!fuelType) return 0;
  return (
    country.pricesPlnPerLiter[fuelType] ??
    getDefaultFuelPricePln(prices, vehicle)
  );
}

function inferCountryFromStop(
  stop: Pick<StopPoint, "name" | "address" | "countryCode">,
  prices: FuelCountryPrice[],
) {
  if (stop.countryCode) {
    const byCode = fuelCountryForCode(stop.countryCode, prices);
    if (byCode) return byCode;
  }
  return getFuelCountryFromText(prices, `${stop.name} ${stop.address}`);
}

export function buildFuelPlan(
  days: Array<{
    id: string;
    stops: Array<
      Pick<
        StopPoint,
        "name" | "address" | "lat" | "lng" | "countryCode" | "travelMode"
      >
    >;
  }>,
  dayMetrics: Record<string, DayRouteMetric>,
  vehicle: VehiclePlain,
  prices: FuelCountryPrice[],
): FuelPlan {
  const fuelType = getVehicleFuelTypeKey(vehicle);
  const timelineSegments: FuelRouteSegment[] = [];
  let routeDistanceTotal = 0;

  function addTimelineDistance(
    country: FuelCountryPrice,
    distanceKm: number,
    startKm: number,
  ) {
    if (distanceKm <= 0) return;

    const endKm = startKm + distanceKm;
    const last = timelineSegments[timelineSegments.length - 1];
    const pricePln = getCountryFuelPricePln(country, fuelType, prices, vehicle);

    if (last && last.code === country.code && last.endKm === startKm) {
      last.distanceKm += distanceKm;
      last.endKm = endKm;
      last.usageL = Math.round((last.distanceKm * vehicle.consumption) / 100);
      last.costPln = Math.round(last.usageL * last.pricePln);
      return;
    }

    const usageL = Math.round((distanceKm * vehicle.consumption) / 100);
    timelineSegments.push({
      id: `${timelineSegments.length}-${country.code}`,
      country: country.country,
      code: country.code,
      distanceKm,
      startKm,
      endKm,
      pricePln,
      usageL,
      costPln: Math.round(usageL * pricePln),
    });
  }

  for (const day of days) {
    if (day.stops.length < 2) continue;

    const metric = dayMetrics[day.id];

    // OSRM returns the full road geometry, including all countries crossed
    // between stops. Classify every small geometry edge locally against
    // country borders, then scale the edge lengths to OSRM's routed distance.
    // This correctly handles e.g. PL -> IT with no stops in CZ/AT/SI.
    if (
      metric?.path &&
      metric.path.length >= 2 &&
      day.stops.slice(1).every((stop) => stop.travelMode !== "walking")
    ) {
      const edges = metric.path.slice(1).map((point, index) => {
        const previous = metric.path[index];
        return {
          distanceKm: haversineKm(
            { lat: previous[0], lng: previous[1] },
            { lat: point[0], lng: point[1] },
          ),
          country:
            countryAtRoutePoint(
              [(previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2],
              prices,
            ) ?? inferCountryFromStop(day.stops[0], prices),
        };
      });
      const geometryDistance = edges.reduce(
        (sum, edge) => sum + edge.distanceKm,
        0,
      );
      const distanceScale =
        geometryDistance > 0 ? metric.distanceKm / geometryDistance : 1;

      for (const edge of edges) {
        const distanceKm = edge.distanceKm * distanceScale;
        if (edge.country) {
          addTimelineDistance(edge.country, distanceKm, routeDistanceTotal);
        }
        routeDistanceTotal += distanceKm;
      }
      continue;
    }

    const legCount = day.stops.length - 1;
    const fallbackLegDistance =
      legCount > 0 ? (metric?.distanceKm ?? 0) / legCount : 0;

    for (let i = 1; i < day.stops.length; i++) {
      if (day.stops[i].travelMode === "walking") continue;
      const fromCountry = inferCountryFromStop(day.stops[i - 1], prices);
      const toCountry = inferCountryFromStop(day.stops[i], prices);
      const distanceKm = metric?.legs[i - 1]?.distanceKm ?? fallbackLegDistance;
      const startKm = routeDistanceTotal;

      if (fromCountry && toCountry && fromCountry.code !== toCountry.code) {
        addTimelineDistance(fromCountry, distanceKm / 2, startKm);
        addTimelineDistance(
          toCountry,
          distanceKm / 2,
          startKm + distanceKm / 2,
        );
      } else {
        const country = toCountry ?? fromCountry;
        if (country) addTimelineDistance(country, distanceKm, startKm);
      }

      routeDistanceTotal += distanceKm;
    }
  }

  const totalDistance = routeDistanceTotal;
  const totalUsage = Math.round((totalDistance * vehicle.consumption) / 100);
  const totalCost = timelineSegments.reduce((sum, s) => sum + s.costPln, 0);

  return {
    timelineSegments,
    totalDistance,
    totalUsage,
    totalCost,
  };
}
