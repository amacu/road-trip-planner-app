import { Prisma } from "@prisma/client";

import { tripWriteAccessWhere } from "@/lib/db/trip-access";
import { reorderWithOffset } from "@/lib/db/utils";
import { prisma } from "@/lib/prisma";

export type TripActivityCreateData = {
  title: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  placeId?: string | null;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: string;
};

export type TripActivityUpdateData = Partial<TripActivityCreateData>;

export async function createTripActivity(
  stopId: string,
  userId: string,
  data: TripActivityCreateData,
) {
  const stop = await prisma.tripStop.findFirst({
    where: { id: stopId, trip: tripWriteAccessWhere(userId) },
    select: { id: true, tripId: true, tripDayId: true },
  });
  if (!stop) return null;

  return prisma.$transaction(async (tx) => {
    // Lock the stop row so concurrent inserts for the same stop serialize
    // instead of racing on the same computed activityOrder.
    await tx.$executeRaw`SELECT id FROM trip_stops WHERE id = ${stopId}::uuid FOR UPDATE`;

    const activityOrder =
      ((
        await tx.tripActivity.aggregate({
          where: { tripStopId: stopId },
          _max: { activityOrder: true },
        })
      )._max.activityOrder ?? 0) + 1;

    return tx.tripActivity.create({
      data: {
        tripId: stop.tripId,
        tripDayId: stop.tripDayId,
        tripStopId: stop.id,
        activityOrder,
        title: data.title.trim(),
        address: data.address?.trim() || null,
        latitude:
          data.latitude === null || data.latitude === undefined
            ? null
            : new Prisma.Decimal(data.latitude),
        longitude:
          data.longitude === null || data.longitude === undefined
            ? null
            : new Prisma.Decimal(data.longitude),
        googleMapsUrl: data.googleMapsUrl?.trim() || null,
        placeId: data.placeId?.trim() || null,
        description: data.description?.trim() || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        category: data.category ?? "sightseeing",
      },
    });
  });
}

export async function updateTripActivity(
  activityId: string,
  userId: string,
  data: TripActivityUpdateData,
) {
  const activity = await prisma.tripActivity.findFirst({
    where: { id: activityId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!activity) return null;

  return prisma.tripActivity.update({
    where: { id: activityId },
    data: {
      title: data.title?.trim(),
      address:
        data.address === undefined ? undefined : data.address?.trim() || null,
      latitude:
        data.latitude === undefined
          ? undefined
          : data.latitude === null
            ? null
            : new Prisma.Decimal(data.latitude),
      longitude:
        data.longitude === undefined
          ? undefined
          : data.longitude === null
            ? null
            : new Prisma.Decimal(data.longitude),
      googleMapsUrl:
        data.googleMapsUrl === undefined
          ? undefined
          : data.googleMapsUrl?.trim() || null,
      placeId:
        data.placeId === undefined ? undefined : data.placeId?.trim() || null,
      description:
        data.description === undefined
          ? undefined
          : data.description?.trim() || null,
      startTime:
        data.startTime === undefined ? undefined : data.startTime || null,
      endTime: data.endTime === undefined ? undefined : data.endTime || null,
      category: data.category,
    },
  });
}

export async function deleteTripActivity(activityId: string, userId: string) {
  const result = await prisma.tripActivity.deleteMany({
    where: { id: activityId, trip: tripWriteAccessWhere(userId) },
  });

  return result.count > 0;
}

export async function reorderTripActivities(
  stopId: string,
  userId: string,
  orderedActivityIds: string[],
) {
  const stop = await prisma.tripStop.findFirst({
    where: { id: stopId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!stop) return false;

  await reorderWithOffset(orderedActivityIds, "activities", stopId);

  return true;
}
