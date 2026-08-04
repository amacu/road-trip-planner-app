import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";
import { getStopWeather } from "@/lib/integrations/open-meteo";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(request: Request) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";
  const endTime = params.get("endTime") ?? "";
  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180 ||
    !DATE_PATTERN.test(date) ||
    !TIME_PATTERN.test(time) ||
    (endTime !== "" && !TIME_PATTERN.test(endTime))
  ) {
    return NextResponse.json(
      { error: "Invalid weather request." },
      { status: 400 },
    );
  }
  try {
    const weather = await getStopWeather(
      lat,
      lng,
      date,
      time,
      endTime || undefined,
    );
    return NextResponse.json(
      { weather },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Weather service unavailable." },
      { status: 502 },
    );
  }
}
