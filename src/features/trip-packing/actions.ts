"use server";

import type { ActionResult } from "@/lib/action-result";
import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import { requireUser } from "@/lib/auth/guards";
import {
  createTripPackingItem,
  deleteTripPackingItem,
  updateTripPackingCategories,
  updateTripPackingItem,
} from "@/lib/db/trip-packing-items";
import {
  tripPackingItemSchema,
  tripPackingItemUpdateSchema,
  packingCategoriesSchema,
  productLinksSchema,
  type PackingCategory,
} from "@/lib/validators/trip-packing-item";

function toPlain(item: {
  id: string;
  name: string;
  category: string;
  acquisition: string;
  quantity: number;
  notes: string | null;
  price: { toNumber(): number } | null;
  productLinks: unknown;
  isPurchased: boolean;
  isPacked: boolean;
  itemOrder: number;
}): TripPackingItemPlain {
  return {
    ...item,
    price: item.price?.toNumber() ?? null,
    productLinks: normalizeProductLinks(item.productLinks),
  };
}

function normalizeProductLinks(value: unknown) {
  const parsed = productLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
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

export async function updateTripPackingCategoriesAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<PackingCategory[]>> {
  const user = await requireUser();
  const parsed = packingCategoriesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid categories.",
    };
  }
  const categories = await updateTripPackingCategories(
    tripId,
    user.id,
    parsed.data,
  );
  if (!categories) return { success: false, error: "Trip not found." };
  return { success: true, data: categories };
}
