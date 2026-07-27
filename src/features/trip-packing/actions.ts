"use server";

import type { ActionResult } from "@/lib/action-result";
import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import { requireUser } from "@/lib/auth/guards";
import {
  createTripPackingItem,
  deleteTripPackingItem,
  updateTripPackingItem,
} from "@/lib/db/trip-packing-items";
import {
  tripPackingItemSchema,
  tripPackingItemUpdateSchema,
} from "@/lib/validators/trip-packing-item";

function toPlain(item: {
  id: string;
  name: string;
  category: string;
  acquisition: string;
  quantity: number;
  notes: string | null;
  isPacked: boolean;
  itemOrder: number;
}): TripPackingItemPlain {
  return item;
}

export async function createTripPackingItemAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<TripPackingItemPlain>> {
  const user = await requireUser();
  const parsed = tripPackingItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid packing item.",
    };
  }
  const item = await createTripPackingItem(tripId, user.id, parsed.data);
  if (!item) return { success: false, error: "Trip not found." };
  return { success: true, data: toPlain(item) };
}

export async function updateTripPackingItemAction(
  tripId: string,
  itemId: string,
  input: unknown,
): Promise<ActionResult<TripPackingItemPlain>> {
  const user = await requireUser();
  const parsed = tripPackingItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid packing item.",
    };
  }
  const item = await updateTripPackingItem(itemId, user.id, parsed.data);
  if (!item) return { success: false, error: "Packing item not found." };
  return { success: true, data: toPlain(item) };
}

export async function deleteTripPackingItemAction(
  tripId: string,
  itemId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteTripPackingItem(itemId, user.id);
  if (!deleted) return { success: false, error: "Packing item not found." };
  return { success: true, data: undefined };
}
