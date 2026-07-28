import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { tripWriteAccessWhere } from "@/lib/db/trip-access";
import type {
  PackingCategory,
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";
import {
  DEFAULT_PACKING_CATEGORIES,
  packingCategoriesSchema,
} from "@/lib/validators/trip-packing-item";

function packingItemData(
  data: TripPackingItemInput | TripPackingItemUpdateInput,
) {
  return {
    name: data.name?.trim(),
    category: data.category?.trim(),
    acquisition: data.acquisition,
    quantity: data.quantity,
    notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    price:
      data.price === undefined
        ? undefined
        : data.price === null
          ? null
          : new Prisma.Decimal(data.price),
    productLinks:
      data.productLinks === undefined
        ? undefined
        : (data.productLinks as Prisma.InputJsonValue),
    isPurchased: data.isPurchased,
    isPacked: data.isPacked,
    itemOrder: data.itemOrder,
  };
}

export async function createTripPackingItem(
  tripId: string,
  userId: string,
  data: TripPackingItemInput,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripWriteAccessWhere(userId) },
    select: {
      id: true,
      packingItems: {
        orderBy: { itemOrder: "desc" },
        take: 1,
        select: { itemOrder: true },
      },
    },
  });
  if (!trip) return null;

  return prisma.tripPackingItem.create({
    data: {
      tripId,
      ...packingItemData(data),
      name: data.name.trim(),
      category: data.category.trim(),
      itemOrder: data.itemOrder ?? (trip.packingItems[0]?.itemOrder ?? -1) + 1,
    },
  });
}

export async function updateTripPackingItem(
  itemId: string,
  userId: string,
  data: TripPackingItemUpdateInput,
) {
  const items = await prisma.tripPackingItem.updateManyAndReturn({
    where: { id: itemId, trip: tripWriteAccessWhere(userId) },
    data: packingItemData(data),
  });
  return items[0] ?? null;
}

export async function deleteTripPackingItem(itemId: string, userId: string) {
  const result = await prisma.tripPackingItem.deleteMany({
    where: { id: itemId, trip: tripWriteAccessWhere(userId) },
  });
  return result.count > 0;
}

export async function updateTripPackingCategories(
  tripId: string,
  userId: string,
  categories: PackingCategory[],
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripWriteAccessWhere(userId) },
    select: { id: true, packingCategories: true },
  });
  if (!trip) return null;

  const parsedCurrent = packingCategoriesSchema.safeParse(
    trip.packingCategories,
  );
  const current = parsedCurrent.success
    ? parsedCurrent.data
    : DEFAULT_PACKING_CATEGORIES;
  const nextById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const fallback =
    categories.find((category) => category.name === "Other")?.name ??
    categories[0].name;

  await prisma.$transaction(async (transaction) => {
    for (const category of current) {
      const next = nextById.get(category.id);
      if (!next) {
        await transaction.tripPackingItem.updateMany({
          where: { tripId, category: category.name },
          data: { category: fallback },
        });
      } else if (next.name !== category.name) {
        await transaction.tripPackingItem.updateMany({
          where: { tripId, category: category.name },
          data: { category: next.name },
        });
      }
    }

    await transaction.trip.update({
      where: { id: tripId },
      data: { packingCategories: categories as Prisma.InputJsonValue },
    });
  });

  return categories;
}
