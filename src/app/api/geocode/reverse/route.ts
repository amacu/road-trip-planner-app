import { NextResponse } from "next/server";

import { reverseGeocode } from "@/lib/integrations/geocode";
import { getCurrentUser } from "@/lib/auth/guards";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ result: null }, { status: 400 });
  }

  try {
    const result = await reverseGeocode(lat, lng);
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Geocoding service unavailable." },
      { status: 502 },
    );
  }
}
