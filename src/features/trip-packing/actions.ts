"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import { requireUser } from "@/lib/auth/guards";
import {
  createTripPackingItem,
  deleteTripPackingItem,
  importTripPackingItems,
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

const aiPackingImportSchema = z.object({
  items: z.array(tripPackingItemSchema).min(1).max(200),
  categories: packingCategoriesSchema,
  replaceExisting: z.boolean(),
});

export async function importAiPackingListAction(
  tripId: string,
  input: unknown,
): Promise<
  ActionResult<{
    items: TripPackingItemPlain[];
    categories: PackingCategory[];
  }>
> {
  const user = await requireUser();
  const parsed = aiPackingImportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid AI packing list.",
    };
  }

  const imported = await importTripPackingItems(tripId, user.id, parsed.data);
  if (!imported) return { success: false, error: "Trip not found." };
  return {
    success: true,
    data: {
      categories: imported.categories,
      items: imported.items.map(toPlain),
    },
  };
}
