"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  createTripStop,
  deleteTripStop,
  importTripDayStops,
  reorderTripStops,
  updateTripStop,
} from "@/lib/db/trip-stops";
import {
  toTripStopSummaryPlain,
  type TripStopSummaryPlain,
} from "@/features/trips/lib/trip-view-model";
import {
  aiDayStopsImportSchema,
  reorderTripStopsSchema,
  tripStopCreateSchema,
  tripStopUpdateSchema,
} from "@/lib/validators/trip-stop";

export async function importTripDayStopsAction(
  _tripId: string,
  dayId: string,
  input: unknown,
): Promise<ActionResult<{ ids: string[] }>> {
  const user = await requireAuthenticatedUser();
  const parsed = aiDayStopsImportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid AI day plan.",
    };
  }

  const ids = await importTripDayStops(dayId, user.id, parsed.data);
  if (!ids) return { success: false, error: "Day not found." };

  return { success: true, data: { ids } };
}

export async function createTripStopAction(
  _tripId: string,
  dayId: string,
  input: unknown,
): Promise<ActionResult<TripStopSummaryPlain>> {
  const user = await requireAuthenticatedUser();
  const parsed = tripStopCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid stop data.",
    };
  }

  const stop = await createTripStop(dayId, user.id, parsed.data);
  if (!stop) {
    return { success: false, error: "Day not found." };
  }

  return { success: true, data: toTripStopSummaryPlain(stop) };
}

export async function updateTripStopAction(
  tripId: string,
  stopId: string,
  input: unknown,
): Promise<ActionResult<TripStopSummaryPlain>> {
  const user = await requireUser();
  const parsed = tripStopUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid stop data.",
    };
  }

  const stop = await updateTripStop(stopId, user.id, parsed.data);
  if (!stop) {
    return { success: false, error: "Stop not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toTripStopSummaryPlain(stop) };
}

export async function deleteTripStopAction(
  tripId: string,
  stopId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteTripStop(stopId, user.id);
  if (!deleted) {
    return { success: false, error: "Stop not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function reorderTripStopsAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderTripStopsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order.",
    };
  }

  const reordered = await reorderTripStops(
    parsed.data.dayId,
    user.id,
    parsed.data.stopIds,
  );
  if (!reordered) {
    return { success: false, error: "Day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}
