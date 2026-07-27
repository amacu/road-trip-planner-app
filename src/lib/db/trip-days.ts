import { tripAccessWhere, tripWriteAccessWhere } from "@/lib/db/trip-access";
import { reorderWithOffset, toDateOrNull } from "@/lib/db/utils";
import { prisma } from "@/lib/prisma";

export type TripDayCreateData = {
  dayNumber?: number;
  date?: string | Date | null;
  name?: string | null;
  notes?: string | null;
  startTime?: string | null;
};

export type TripDayUpdateData = Partial<TripDayCreateData>;

export async function getTripDays(tripId: string, userId: string) {
  return prisma.tripDay.findMany({
    where: { tripId, trip: tripAccessWhere(userId) },
    orderBy: { dayNumber: "asc" },
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
      },
    },
  });
}

export async function createTripDay(
  tripId: string,
  userId: string,
  data: TripDayCreateData,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!trip) return null;

  return prisma.$transaction(async (tx) => {
    // Lock the trip row so concurrent inserts for the same trip serialize
    // instead of racing on the same computed dayNumber.
    await tx.$executeRaw`SELECT id FROM trips WHERE id = ${tripId}::uuid FOR UPDATE`;

    const dayNumber =
      data.dayNumber ??
      ((
        await tx.tripDay.aggregate({
          where: { tripId },
          _max: { dayNumber: true },
        })
      )._max.dayNumber ?? 0) + 1;

    return tx.tripDay.create({
      data: {
        tripId,
        dayNumber,
        date: toDateOrNull(data.date),
        name: data.name?.trim() || null,
        notes: data.notes?.trim() || null,
        startTime: data.startTime || null,
      },
      include: {
        stops: {
          orderBy: { stopOrder: "asc" },
        },
      },
    });
  });
}

export async function updateTripDay(
  dayId: string,
  userId: string,
  data: TripDayUpdateData,
) {
  const day = await prisma.tripDay.findFirst({
    where: { id: dayId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!day) return null;

  return prisma.tripDay.update({
    where: { id: dayId },
    data: {
      dayNumber: data.dayNumber,
      date: data.date === undefined ? undefined : toDateOrNull(data.date),
      name: data.name === undefined ? undefined : data.name?.trim() || null,
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
      startTime:
        data.startTime === undefined ? undefined : data.startTime || null,
    },
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
      },
    },
  });
}

export async function deleteTripDay(dayId: string, userId: string) {
  const result = await prisma.tripDay.deleteMany({
    where: { id: dayId, trip: tripWriteAccessWhere(userId) },
  });

  return result.count > 0;
}

/**
 * Persists a new day order for a trip in one transaction. `orderedDayIds`
 * must be the full, final ordering of every day in the trip.
 *
 * Runs in two passes (offset to unique temporary values, then to the real
 * 1..n values) because `[tripId, dayNumber]` is a unique constraint and
 * Postgres checks it after each individual UPDATE — writing final values
 * directly can collide mid-transaction whenever two days swap positions.
 */
export async function reorderTripDays(
  tripId: string,
  userId: string,
  orderedDayIds: string[],
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!trip) return false;

  await reorderWithOffset(orderedDayIds, "days", tripId);

  return true;
}
