"use server";

import {
  createTripActivity,
  deleteTripActivity,
  reorderTripActivities,
  updateTripActivity,
} from "@/lib/db/trip-activities";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import {
  toTripActivitySummaryPlain,
  type TripActivitySummaryPlain,
} from "@/features/trips/lib/trip-view-model";
import {
  reorderTripActivitiesSchema,
  tripActivityCreateSchema,
  tripActivityUpdateSchema,
} from "@/lib/validators/trip-activity";
import { type ActionResult } from "@/lib/action-result";

export async function createTripActivityAction(
  _tripId: string,
  stopId: string,
  input: unknown,
): Promise<ActionResult<TripActivitySummaryPlain>> {
  const user = await requireAuthenticatedUser();
  const parsed = tripActivityCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid activity data.",
    };
  }

  const activity = await createTripActivity(stopId, user.id, parsed.data);
  if (!activity) {
    return { success: false, error: "Stop not found." };
  }

  return { success: true, data: toTripActivitySummaryPlain(activity) };
}

export async function updateTripActivityAction(
  _tripId: string,
  activityId: string,
  input: unknown,
): Promise<ActionResult<TripActivitySummaryPlain>> {
  const user = await requireAuthenticatedUser();
  const parsed = tripActivityUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid activity data.",
    };
  }

  const activity = await updateTripActivity(activityId, user.id, parsed.data);
  if (!activity) {
    return { success: false, error: "Activity not found." };
  }

  return { success: true, data: toTripActivitySummaryPlain(activity) };
}

export async function deleteTripActivityAction(
  _tripId: string,
  activityId: string,
): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  const deleted = await deleteTripActivity(activityId, user.id);
  if (!deleted) {
    return { success: false, error: "Activity not found." };
  }

  return { success: true, data: undefined };
}

export async function reorderTripActivitiesAction(
  _tripId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  const parsed = reorderTripActivitiesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order.",
    };
  }

  const reordered = await reorderTripActivities(
    parsed.data.stopId,
    user.id,
    parsed.data.activityIds,
  );
  if (!reordered) {
    return { success: false, error: "Stop not found." };
  }

  return { success: true, data: undefined };
}
