import { prisma } from "@/lib/prisma";
import { tripWriteAccessWhere } from "@/lib/db/trip-access";
import type {
  TripPackingItemInput,
  TripPackingItemUpdateInput,
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
