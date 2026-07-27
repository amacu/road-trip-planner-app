import type { TripPlain } from "@/features/trips/lib/trip-view-model";
import { formatDistance, formatDuration } from "@/lib/geo";

/**
 * Mirrors planner-view.tsx's getDayDate: a day's calendar date is always
 * derived from the trip's start date plus its position in the day list,
 * never read from the (unused, potentially stale) TripDay.date column.
 */
function getDayDate(dayIndex: number, tripStartDate: string | null) {
  if (!tripStartDate) return null;
  const date = new Date(`${tripStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

/**
 * Renders a trip as plain-text markdown meant to be pasted into an AI chat
 * (ChatGPT, Claude, etc.) so the user can keep planning with an assistant
 * that has no access to this app. Kept dependency-free (no network calls,
 * no route recalculation) so it can run instantly, client-side, from
 * whatever data is already on screen.
 */
export function buildTripExportPrompt(
  trip: TripPlain,
  totals: { totalKm: number; totalMin: number; fuelPln: number },
): string {
  const lines: string[] = [];

  lines.push(`# Road trip: ${trip.name}`);
  if (trip.description) lines.push(trip.description);

  const meta: string[] = [];
  if (trip.startDate) meta.push(`Starts ${trip.startDate}`);
  if (trip.days.length > 0) {
    meta.push(`${trip.days.length} ${trip.days.length === 1 ? "day" : "days"}`);
  }
  if (trip.stays.length > 0) {
    meta.push(
      `${trip.stays.length} ${trip.stays.length === 1 ? "night" : "nights"} planned`,
    );
  }
  if (totals.totalKm > 0) meta.push(formatDistance(totals.totalKm));
  if (totals.totalMin > 0)
    meta.push(`${formatDuration(totals.totalMin)} driving`);
  if (trip.vehicle) {
    meta.push(
      `Vehicle: ${trip.vehicle.name} (${trip.vehicle.fuelType}, ${trip.vehicle.consumption} L/100km)`,
    );
  }
  if (totals.fuelPln > 0) {
    meta.push(`~${Math.round(totals.fuelPln)} PLN estimated fuel`);
  }
  if (meta.length > 0) lines.push("", meta.join(" · "));

  if (trip.days.length === 0) {
    lines.push("", "No days planned yet.");
  }

  trip.days.forEach((day, dayIndex) => {
    lines.push("", `## Day ${dayIndex + 1}${day.name ? `: ${day.name}` : ""}`);
    const dayMeta: string[] = [];
    const dayDate = getDayDate(dayIndex, trip.startDate);
    if (dayDate) dayMeta.push(dayDate);
    if (day.startTime) dayMeta.push(`starts ${day.startTime}`);
    if (dayMeta.length > 0) lines.push(dayMeta.join(" · "));
    if (day.notes) lines.push(`Notes: ${day.notes}`);

    if (day.stops.length === 0) {
      lines.push("- No stops yet.");
    }

    day.stops.forEach((stop, stopIndex) => {
      if (stopIndex > 0) {
        lines.push(
          `  → ${stop.travelMode === "walking" ? "Walk" : "Drive"} from the previous item`,
        );
      }
      const stopParts = [
        stop.itemType === "activity"
          ? `Activity: ${stop.name}`
          : `Stop ${day.stops.slice(0, stopIndex + 1).filter((item) => item.itemType === "stop").length}: ${stop.name}`,
      ];
      if (stop.address) stopParts.push(`(${stop.address})`);
      if (stop.visitDurationMin) {
        stopParts.push(`— visit ~${formatDuration(stop.visitDurationMin)}`);
      }
      lines.push(`- ${stopParts.join(" ")}`);

      if (stop.notes) lines.push(`  Notes: ${stop.notes}`);
      if (stop.description) lines.push(`  ${stop.description}`);

      stop.activities.forEach((activity) => {
        const activityParts = [activity.title];
        if (activity.startTime) {
          activityParts.push(
            activity.endTime
              ? `${activity.startTime}–${activity.endTime}`
              : `at ${activity.startTime}`,
          );
        }
        if (activity.category && activity.category !== "sightseeing") {
          activityParts.push(`[${activity.category}]`);
        }
        lines.push(`  - ${activityParts.join(" — ")}`);
        if (activity.description) lines.push(`    ${activity.description}`);
      });
    });

    const stay =
      dayIndex < trip.days.length - 1
        ? trip.stays.find((item) => item.afterDayId === day.id)
        : undefined;
    if (stay) {
      if (stay.stayType === "driving_overnight") {
        lines.push("", "### Night", "- Driving overnight to the next day.");
      } else {
        const stayDetails: string[] = [stay.name];
        if (stay.address) stayDetails.push(`(${stay.address})`);
        lines.push("", "### Overnight stay", `- ${stayDetails.join(" ")}`);

        const stayMeta: string[] = [];
        if (stay.checkInTime)
          stayMeta.push(`check-in from ${stay.checkInTime}`);
        if (stay.checkOutTime)
          stayMeta.push(`check-out by ${stay.checkOutTime}`);
        if (stay.price !== null) {
          stayMeta.push(`${stay.price} ${stay.currency}`);
        }
        if (stayMeta.length > 0) lines.push(`  ${stayMeta.join(" · ")}`);
      }
    } else if (dayIndex < trip.days.length - 1) {
      lines.push("", "### Night", "- No overnight plan yet.");
    }
  });

  if (trip.unassignedStops.length > 0) {
    lines.push("", "## Unassigned stops (not yet scheduled into a day)");
    trip.unassignedStops.forEach((stop, index) => {
      const parts = [`${index + 1}. ${stop.name}`];
      if (stop.address) parts.push(`(${stop.address})`);
      lines.push(`- ${parts.join(" ")}`);
    });
  }

  lines.push(
    "",
    "---",
    "Help me refine this road trip plan — suggest improvements, fill gaps, or answer questions I have about it.",
  );

  return lines.join("\n");
}
