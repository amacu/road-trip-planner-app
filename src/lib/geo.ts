/** Cycling palette used to give each day of a trip a distinct marker color on the map. */
const DAY_MARKER_COLORS = [
  "#E4562A",
  "#2E7A57",
  "#6E9BC0",
  "#B5502E",
  "#8a5f9c",
  "#c98a2b",
  "#4A7B8C",
];

export function dayMarkerColor(dayIndex: number) {
  return DAY_MARKER_COLORS[dayIndex % DAY_MARKER_COLORS.length];
}

/** Maps every stop id across the given days to that day's marker color, for coloring an all-days map view. */
export function buildDayStopColors(
  days: Array<{ stops: Array<{ id: string }> }>,
): Record<string, string> {
  const colors: Record<string, string> = {};
  days.forEach((day, dayIndex) => {
    const color = dayMarkerColor(dayIndex);
    day.stops.forEach((stop) => {
      colors[stop.id] = color;
    });
  });
  return colors;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

type StopLike = {
  latitude: { toNumber: () => number } | null;
  longitude: { toNumber: () => number } | null;
};

/** Total straight-line distance across an ordered list of stops with Decimal coordinates. */
export function dayDistanceKm(stops: StopLike[]): number {
  const points = stops
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((s) => ({
      lat: s.latitude!.toNumber(),
      lng: s.longitude!.toNumber(),
    }));

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}

export function estimateDriveMinutes(km: number) {
  return Math.round((km / 70) * 60);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDistance(km: number, units: "km" | "mi" = "km") {
  const v = units === "mi" ? km * 0.621371 : km;
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units}`;
}

/** Adds minutes to an "HH:mm" time string, wrapping around midnight. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
}

export type StopSchedule = {
  arrivalTime: string | null;
  departureTime: string | null;
};

/**
 * Derives each stop's arrival/departure time from the day's start time, the
 * drive duration of each leg, and each stop's visit duration. When the day
 * starts away from the first stop, `initialLegDurationMin` shifts its arrival
 * by that opening journey. Every stop then departs after its visit duration.
 */
export function computeStopSchedule(
  dayStartTime: string | null,
  stops: Array<{
    visitDurationMin: number | null;
    itemType?: "stop" | "activity";
  }>,
  legs: Array<{ durationMin: number }>,
  initialLegDurationMin = 0,
): StopSchedule[] {
  if (!dayStartTime)
    return stops.map(() => ({ arrivalTime: null, departureTime: null }));

  const schedule: StopSchedule[] = [];
  let cursor = addMinutesToTime(dayStartTime, initialLegDurationMin);

  for (let i = 0; i < stops.length; i++) {
    const arrivalTime = cursor;
    const departureTime = addMinutesToTime(
      cursor,
      stops[i].visitDurationMin ?? 0,
    );
    schedule.push({ arrivalTime, departureTime });

    const leg = legs[i];
    cursor = leg
      ? addMinutesToTime(departureTime, leg.durationMin)
      : departureTime;
  }

  return schedule;
}
