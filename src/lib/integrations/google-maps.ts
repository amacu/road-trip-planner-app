export type GoogleMapsStop = { lat: number; lng: number };

/**
 * Google Maps directions supports at most 10 waypoints (origin + destination + up to 8 waypoints
 * historically; modern web supports more but we chunk conservatively at 10 total points per URL).
 * If a day has more, we return multiple URLs.
 */
export function googleMapsUrlsForStops(stops: GoogleMapsStop[]): string[] {
  const validStops = stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
  );
  if (validStops.length < 2) return [];

  const MAX = 10;
  const chunks: GoogleMapsStop[][] = [];
  let i = 0;
  while (i < validStops.length) {
    const end = Math.min(i + MAX, validStops.length);
    chunks.push(validStops.slice(i, end));
    if (end === validStops.length) break;
    i = end - 1; // overlap so next chunk starts where prev ended
  }

  return chunks.map((chunk) => {
    const points = chunk.map((s) => `${s.lat},${s.lng}`);
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1).join("|");
    const params = new URLSearchParams({
      api: "1",
      travelmode: "driving",
      origin,
      destination,
    });
    if (waypoints) params.set("waypoints", waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  });
}

export function openInGoogleMaps(stops: GoogleMapsStop[]) {
  const urls = googleMapsUrlsForStops(stops);
  for (const url of urls) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
