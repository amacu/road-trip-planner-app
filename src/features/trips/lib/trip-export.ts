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
  totals: {
    totalKm: number;
    totalMin: number;
    fuelPln: number;
    includeClosingInstruction?: boolean;
  },
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

  if (totals.includeClosingInstruction !== false) {
    lines.push(
      "",
      "---",
      "Help me refine this road trip plan — suggest improvements, fill gaps, or answer questions I have about it.",
    );
  }

  return lines.join("\n");
}

/**
 * Builds the deliberately small trip context used by the packing assistant.
 * Unlike the general-purpose export, this must not expose free-form trip,
 * day, stop, stay, or activity notes. Packing only needs the itinerary shape.
 */
export function buildPackingTripContext(
  trip: TripPlain,
  totals: {
    totalKm: number;
    totalMin: number;
  },
): string {
  const lines: string[] = [`Trip: ${trip.name}`];
  const summary: string[] = [];

  if (trip.startDate) summary.push(`starts ${trip.startDate}`);
  summary.push(
    `${trip.days.length} ${trip.days.length === 1 ? "day" : "days"}`,
  );
  if (totals.totalKm > 0) summary.push(formatDistance(totals.totalKm));
  if (totals.totalMin > 0) {
    summary.push(`${formatDuration(totals.totalMin)} driving`);
  }
  if (trip.vehicle) {
    summary.push(
      `vehicle: ${trip.vehicle.name}${trip.vehicle.type ? ` (${trip.vehicle.type})` : ""}`,
    );
  }
  lines.push(summary.join(" · "));

  trip.days.forEach((day, dayIndex) => {
    const dayHeader = [`Day ${dayIndex + 1}`];
    const dayDate = getDayDate(dayIndex, trip.startDate);
    if (dayDate) dayHeader.push(dayDate);
    if (day.name) dayHeader.push(day.name);
    if (day.startTime) dayHeader.push(`starts ${day.startTime}`);
    lines.push("", dayHeader.join(" · "));

    if (day.stops.length === 0) {
      lines.push("- No places planned");
    }

    day.stops.forEach((stop, stopIndex) => {
      const details: string[] = [];
      if (stopIndex > 0) {
        details.push(stop.travelMode === "walking" ? "walk" : "drive");
      }
      details.push(stop.name);
      if (stop.address) details.push(stop.address);
      if (stop.startTime) {
        details.push(
          stop.endTime
            ? `${stop.startTime}–${stop.endTime}`
            : `at ${stop.startTime}`,
        );
      }
      if (stop.visitDurationMin) {
        details.push(`visit ${formatDuration(stop.visitDurationMin)}`);
      }
      lines.push(`- ${details.join(" · ")}`);

      stop.activities.forEach((activity) => {
        const activityDetails = [activity.title];
        if (activity.startTime) {
          activityDetails.push(
            activity.endTime
              ? `${activity.startTime}–${activity.endTime}`
              : `at ${activity.startTime}`,
          );
        }
        if (activity.category) activityDetails.push(activity.category);
        lines.push(`  - ${activityDetails.join(" · ")}`);
      });
    });

    const stay =
      dayIndex < trip.days.length - 1
        ? trip.stays.find((item) => item.afterDayId === day.id)
        : undefined;
    if (stay?.stayType === "driving_overnight") {
      lines.push("- Night: driving overnight");
    } else if (stay) {
      const stayDetails = [`Night: ${stay.name}`];
      if (stay.address) stayDetails.push(stay.address);
      if (stay.checkInTime) stayDetails.push(`check-in ${stay.checkInTime}`);
      if (stay.checkOutTime) stayDetails.push(`check-out ${stay.checkOutTime}`);
      lines.push(`- ${stayDetails.join(" · ")}`);
    } else if (dayIndex < trip.days.length - 1) {
      lines.push("- Night: not planned");
    }
  });

  return lines.join("\n");
}
