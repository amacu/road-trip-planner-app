import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";
import { getStopWeather } from "@/lib/integrations/open-meteo";

type WeatherPoint = {
  lat: number;
  lng: number;
  date: string;
  time: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function validPoint(value: unknown): value is WeatherPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<WeatherPoint>;
  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng) &&
    point.lng >= -180 &&
    point.lng <= 180 &&
    typeof point.date === "string" &&
    DATE_PATTERN.test(point.date) &&
    typeof point.time === "string" &&
    TIME_PATTERN.test(point.time)
  );
}

export async function POST(request: Request) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { points?: unknown };
  try {
    body = (await request.json()) as { points?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !Array.isArray(body.points) ||
    body.points.length === 0 ||
    body.points.length > 20 ||
    !body.points.every(validPoint)
  ) {
    return NextResponse.json(
      { error: "Invalid weather points." },
      { status: 400 },
    );
  }

  const results = await Promise.allSettled(
    body.points.map((point) =>
      getStopWeather(point.lat, point.lng, point.date, point.time),
    ),
  );
  const weather = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (!weather.length)
    return NextResponse.json(
      { error: "Weather service unavailable." },
      { status: 502 },
    );

  return NextResponse.json({ weather });
}
