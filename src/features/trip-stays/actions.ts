"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";
import { requireUser } from "@/lib/auth/guards";
import {
  deleteTripStay,
  updateTripStay,
  upsertTripStay,
} from "@/lib/db/trip-stays";
import {
  tripStaySchema,
  tripStayUpdateSchema,
} from "@/lib/validators/trip-stay";

export async function saveTripStayAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<TripStayPlain>> {
  const user = await requireUser();
  const parsed = tripStaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid stay.",
    };
  }
  const stay = await upsertTripStay(tripId, user.id, parsed.data);
  if (!stay) return { success: false, error: "Trip day not found." };
  revalidatePath(`/trips/${tripId}`);
  return {
    success: true,
    data: {
      id: stay.id,
      afterDayId: stay.afterDayId,
      name: stay.name,
      stayType: stay.stayType,
      status: stay.status,
      address: stay.address ?? "",
      lat: stay.latitude?.toNumber() ?? null,
      lng: stay.longitude?.toNumber() ?? null,
      countryCode: stay.countryCode,
      price: stay.price?.toNumber() ?? null,
      currency: stay.currency,
      bookingUrl: stay.bookingUrl,
      confirmation: stay.confirmation,
      notes: stay.notes,
    },
  };
}

export async function updateTripStayAction(
  tripId: string,
  stayId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = tripStayUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid stay.",
    };
  }
  const stay = await updateTripStay(stayId, user.id, parsed.data);
  if (!stay) return { success: false, error: "Stay not found." };
  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function deleteTripStayAction(
  tripId: string,
  stayId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteTripStay(stayId, user.id);
  if (!deleted) return { success: false, error: "Stay not found." };
  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}
