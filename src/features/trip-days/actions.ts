"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  createTripDay,
  deleteTripDay,
  reorderTripDays,
  updateTripDay,
} from "@/lib/db/trip-days";
import {
  toTripDaySummaryPlain,
  type TripDaySummaryPlain,
} from "@/features/trips/lib/trip-view-model";
import {
  reorderTripDaysSchema,
  tripDayCreateSchema,
  tripDayUpdateSchema,
} from "@/lib/validators/trip-day";

export async function createTripDayAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<TripDaySummaryPlain>> {
  const user = await requireAuthenticatedUser();
  const parsed = tripDayCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid day data.",
    };
  }

  const day = await createTripDay(tripId, user.id, parsed.data);
  if (!day) {
    return { success: false, error: "Trip not found." };
  }

  return { success: true, data: toTripDaySummaryPlain(day) };
}

export async function updateTripDayAction(
  tripId: string,
  dayId: string,
  input: unknown,
): Promise<ActionResult<TripDaySummaryPlain>> {
  const user = await requireUser();
  const parsed = tripDayUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid day data.",
    };
  }

  const day = await updateTripDay(dayId, user.id, parsed.data);
  if (!day) {
    return { success: false, error: "Day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toTripDaySummaryPlain(day) };
}

export async function deleteTripDayAction(
  tripId: string,
  dayId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteTripDay(dayId, user.id);
  if (!deleted) {
    return { success: false, error: "Day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function reorderTripDaysAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderTripDaysSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order.",
    };
  }

  const reordered = await reorderTripDays(tripId, user.id, parsed.data.dayIds);
  if (!reordered) {
    return { success: false, error: "Trip not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}
