import { NextResponse } from "next/server";

import { geocode } from "@/lib/integrations/geocode";
import { getCurrentUser } from "@/lib/auth/guards";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 160) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }

  try {
    const results = await geocode(query);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Geocoding service unavailable." },
      { status: 502 },
    );
  }
}
