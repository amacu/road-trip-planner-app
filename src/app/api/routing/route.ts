import { NextResponse } from "next/server";

type ValhallaResponse = {
  trip?: {
    summary?: { length?: number; time?: number };
    legs?: Array<{
      shape?: string;
      summary?: { length?: number; time?: number };
    }>;
  };
};

const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;
const waitingRequests: Array<() => void> = [];

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
    const data = await withRoutingSlot(async () => {
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

      if (!response.ok) {
        throw new Error(`Valhalla returned ${response.status}.`);
      }
      return (await response.json()) as ValhallaResponse;
    });

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

    return NextResponse.json({
      code: "Ok",
      routes: [
        {
          distance: distanceKm * 1000,
          duration: durationSeconds,
          geometry: { coordinates: geometry },
          legs: legs.map((leg) => ({
            distance: (leg.summary?.length ?? 0) * 1000,
            duration: leg.summary?.time ?? 0,
          })),
        },
      ],
    });
  } catch (error) {
    console.error("Routing request failed:", error);
    return NextResponse.json(
      { error: "Routing service unavailable." },
      { status: 502 },
    );
  }
}
