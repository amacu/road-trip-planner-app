"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  createTripStop,
  deleteTripStop,
  duplicateTripStop,
  importTripDayStops,
  reorderTripStops,
  updateTripStop,
} from "@/lib/db/trip-stops";
import {
  toStopPoint,
  toTripStopSummaryPlain,
  type StopPoint,
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
  _tripId: string,
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

export async function duplicateTripStopAction(
  tripId: string,
  stopId: string,
  targetDayId: string,
): Promise<ActionResult<StopPoint>> {
  const user = await requireUser();
  const ids = z
    .object({ stopId: z.string().uuid(), targetDayId: z.string().uuid() })
    .safeParse({ stopId, targetDayId });
  if (!ids.success) {
    return { success: false, error: "Invalid stop or day." };
  }

  let copy: Awaited<ReturnType<typeof duplicateTripStop>>;
  try {
    copy = await duplicateTripStop(stopId, targetDayId, user.id);
  } catch (error) {
    console.error("Could not duplicate trip stop", error);
    return {
      success: false,
      error: "The database could not copy this item. Please try again.",
    };
  }
  if (!copy) {
    return { success: false, error: "Stop or target day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toStopPoint(copy) };
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
