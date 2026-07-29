import { Prisma } from "@prisma/client";

import { tripWriteAccessWhere } from "@/lib/db/trip-access";
import { reorderWithOffset } from "@/lib/db/utils";
import { prisma } from "@/lib/prisma";
import type { AiDayStopsImportInput } from "@/lib/validators/trip-stop";

export type TripStopCreateData = {
  stopOrder?: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  placeId?: string | null;
  countryCode?: string | null;
  stopType?: string;
  travelMode?: string;
  startTime?: string | null;
  endTime?: string | null;
  category?: string | null;
  description?: string | null;
  visitDurationMin?: number | null;
  notes?: string | null;
};

export type TripStopUpdateData = Partial<TripStopCreateData>;

export async function createTripStop(
  dayId: string,
  userId: string,
  data: TripStopCreateData,
) {
  const day = await prisma.tripDay.findFirst({
    where: { id: dayId, trip: tripWriteAccessWhere(userId) },
    select: { id: true, tripId: true },
  });
  if (!day) return null;

  return prisma.$transaction(async (tx) => {
    // Lock the day row so concurrent inserts for the same day serialize
    // instead of racing on the same computed stopOrder.
    await tx.$executeRaw`SELECT id FROM trip_days WHERE id = ${dayId}::uuid FOR UPDATE`;

    const stopOrder =
      data.stopOrder ??
      ((
        await tx.tripStop.aggregate({
          where: { tripDayId: dayId },
          _max: { stopOrder: true },
        })
      )._max.stopOrder ?? 0) + 1;

    return tx.tripStop.create({
      data: {
        tripId: day.tripId,
        tripDayId: dayId,
        stopOrder,
        name: data.name.trim(),
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
        countryCode: data.countryCode?.trim().toUpperCase() || null,
        stopType: data.stopType ?? "stop",
        travelMode: data.travelMode ?? "driving",
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        category: data.category?.trim() || null,
        description: data.description?.trim() || null,
        visitDurationMin: data.visitDurationMin ?? null,
        notes: data.notes?.trim() || null,
      },
    });
  });
}

export async function importTripDayStops(
  dayId: string,
  userId: string,
  input: AiDayStopsImportInput,
) {
  return prisma.$transaction(async (tx) => {
    const day = await tx.tripDay.findFirst({
      where: { id: dayId, trip: tripWriteAccessWhere(userId) },
      select: { id: true, tripId: true },
    });
    if (!day) return null;

    await tx.$executeRaw`SELECT id FROM trip_days WHERE id = ${dayId}::uuid FOR UPDATE`;

    await tx.tripDay.update({
      where: { id: dayId },
      data: {
        notes: input.dayNotesMarkdown || null,
        startTime: input.dayStartTime,
      },
    });

    if (input.replaceExisting) {
      await tx.tripStop.deleteMany({ where: { tripDayId: dayId } });
    }

    const firstOrder = input.replaceExisting
      ? 1
      : ((
          await tx.tripStop.aggregate({
            where: { tripDayId: dayId },
            _max: { stopOrder: true },
          })
        )._max.stopOrder ?? 0) + 1;

    const created = await tx.tripStop.createManyAndReturn({
      data: input.items.map((item, index) => ({
        tripId: day.tripId,
        tripDayId: dayId,
        stopOrder: firstOrder + index,
        name: item.name,
        address: item.address || null,
        latitude: new Prisma.Decimal(item.latitude),
        longitude: new Prisma.Decimal(item.longitude),
        countryCode: item.countryCode,
        stopType: item.itemType,
        travelMode: item.travelMode,
        description: item.description || null,
        visitDurationMin: item.visitDurationMin,
      })),
      select: { id: true, stopOrder: true },
    });

    return created
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((stop) => stop.id);
  });
}

export async function updateTripStop(
  stopId: string,
  userId: string,
  data: TripStopUpdateData,
) {
  const stop = await prisma.tripStop.findFirst({
    where: { id: stopId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!stop) return null;

  return prisma.tripStop.update({
    where: { id: stopId },
    data: {
      stopOrder: data.stopOrder,
      name: data.name?.trim(),
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
      countryCode:
        data.countryCode === undefined
          ? undefined
          : data.countryCode?.trim().toUpperCase() || null,
      stopType: data.stopType,
      travelMode: data.travelMode,
      startTime:
        data.startTime === undefined ? undefined : data.startTime || null,
      endTime: data.endTime === undefined ? undefined : data.endTime || null,
      category:
        data.category === undefined ? undefined : data.category?.trim() || null,
      description:
        data.description === undefined
          ? undefined
          : data.description?.trim() || null,
      visitDurationMin: data.visitDurationMin,
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    },
  });
}

export async function deleteTripStop(stopId: string, userId: string) {
  const result = await prisma.tripStop.deleteMany({
    where: { id: stopId, trip: tripWriteAccessWhere(userId) },
  });

  return result.count > 0;
}

/**
 * Persists a new stop order for a day in one transaction. `orderedStopIds`
 * must be the full, final ordering of every stop in the day.
 *
 * Runs in two passes (offset to unique temporary values, then to the real
 * 1..n values) because `[tripDayId, stopOrder]` is a unique constraint and
 * Postgres checks it after each individual UPDATE — writing final values
 * directly can collide mid-transaction whenever two stops swap positions
 * (e.g. reversing the order of just 2 stops).
 */
export async function reorderTripStops(
  dayId: string,
  userId: string,
  orderedStopIds: string[],
) {
  const day = await prisma.tripDay.findFirst({
    where: { id: dayId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!day) return false;

  await reorderWithOffset(orderedStopIds, "stops", dayId);

  return true;
}
