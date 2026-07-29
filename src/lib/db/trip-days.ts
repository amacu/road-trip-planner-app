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

    const previousDay = await tx.tripDay.findFirst({
      where: { tripId },
      orderBy: { dayNumber: "desc" },
      select: {
        dayNumber: true,
        stayAfter: {
          select: {
            stayType: true,
            latitude: true,
            longitude: true,
          },
        },
        stops: {
          orderBy: { stopOrder: "desc" },
          take: 1,
        },
      },
    });
    const previousStayDefinesStart =
      previousDay?.stayAfter?.stayType !== "driving_overnight" &&
      previousDay?.stayAfter?.latitude != null &&
      previousDay.stayAfter.longitude != null;
    const previousLastStop = previousStayDefinesStart
      ? undefined
      : previousDay?.stops[0];

    const dayNumber = data.dayNumber ?? (previousDay?.dayNumber ?? 0) + 1;

    const day = await tx.tripDay.create({
      data: {
        tripId,
        dayNumber,
        date: toDateOrNull(data.date),
        name: data.name?.trim() || null,
        notes: data.notes?.trim() || null,
        startTime: data.startTime || null,
      },
    });

    const carryOverStop = previousLastStop
      ? await tx.tripStop.create({
          data: {
            tripId,
            tripDayId: day.id,
            stopOrder: 1,
            name: previousLastStop.name,
            address: previousLastStop.address,
            latitude: previousLastStop.latitude,
            longitude: previousLastStop.longitude,
            countryCode: previousLastStop.countryCode,
            stopType: "stop",
            travelMode: "driving",
          },
          select: { id: true },
        })
      : null;

    return {
      day,
      carryOverStopId: carryOverStop?.id ?? null,
    };
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
  return prisma.$transaction(async (tx) => {
    const day = await tx.tripDay.findFirst({
      where: { id: dayId, trip: tripWriteAccessWhere(userId) },
      select: { id: true, tripId: true },
    });
    if (!day) return false;

    await tx.$executeRaw`SELECT id FROM trips WHERE id = ${day.tripId}::uuid FOR UPDATE`;

    const result = await tx.tripDay.deleteMany({
      where: { id: day.id, tripId: day.tripId },
    });
    if (result.count === 0) return false;

    // Move every remaining number outside the unique-key range first, then
    // compact the sequence back to 1..n. Doing both steps under the trip-row
    // lock keeps a concurrent create from observing or producing gaps.
    await tx.$executeRaw`
      UPDATE trip_days
      SET day_number = day_number + 1000000
      WHERE trip_id = ${day.tripId}::uuid
    `;
    await tx.$executeRaw`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY day_number, created_at, id)::int AS next_number
        FROM trip_days
        WHERE trip_id = ${day.tripId}::uuid
      )
      UPDATE trip_days AS day
      SET day_number = ordered.next_number
      FROM ordered
      WHERE day.id = ordered.id
    `;

    return true;
  });
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
