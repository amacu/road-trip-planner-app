import { NextResponse } from "next/server";

import { fetchPois } from "@/lib/integrations/poi";
import { getCurrentUser } from "@/lib/auth/guards";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const south = Number(searchParams.get("south"));
  const west = Number(searchParams.get("west"));
  const north = Number(searchParams.get("north"));
  const east = Number(searchParams.get("east"));

  const bounds = [south, west, north, east];
  const invalidBounds =
    bounds.some((value) => !Number.isFinite(value)) ||
    south < -90 ||
    north > 90 ||
    west < -180 ||
    east > 180 ||
    south >= north ||
    west >= east ||
    north - south > 1 ||
    east - west > 1;

  if (invalidBounds) {
    return NextResponse.json(
      { error: "Invalid or excessively large bounds." },
      { status: 400 },
    );
  }

  try {
    const results = await fetchPois({ south, west, north, east });
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "POI service unavailable." },
      { status: 502 },
    );
  }
}
