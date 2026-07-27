import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { tripAccessWhere, tripWriteAccessWhere } from "@/lib/db/trip-access";
import { toDateOrNull } from "@/lib/db/utils";

export type TripCreateData = {
  vehicleId?: string | null;
  name: string;
  description?: string | null;
  startDate?: string | Date | null;
};

export type TripUpdateData = Partial<TripCreateData> & {
  heroImageUrl?: string | null;
};

const tripInclude = {
  vehicle: true,
  members: { orderBy: { createdAt: "asc" }, include: { user: true } },
  stays: { orderBy: { createdAt: "asc" } },
  packingItems: { orderBy: [{ itemOrder: "asc" }, { createdAt: "asc" }] },
  days: {
    orderBy: { dayNumber: "asc" },
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
        include: {
          activities: { orderBy: { activityOrder: "asc" } },
        },
      },
    },
  },
  stops: {
    where: { tripDayId: null },
    orderBy: { stopOrder: "asc" },
    include: {
      activities: { orderBy: { activityOrder: "asc" } },
    },
  },
} satisfies Prisma.TripInclude;

export async function getTrips(userId: string) {
  return prisma.trip.findMany({
    where: tripAccessWhere(userId),
    orderBy: { updatedAt: "desc" },
    include: {
      vehicle: true,
      members: { orderBy: { createdAt: "asc" }, include: { user: true } },
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          stops: {
            orderBy: { stopOrder: "asc" },
            include: {
              activities: { orderBy: { activityOrder: "asc" } },
            },
          },
        },
      },
    },
  });
}

export async function getLatestTripId(userId: string) {
  return prisma.trip.findFirst({
    where: tripAccessWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
}

export async function getTripSwitcherItems(userId: string) {
  return prisma.trip.findMany({
    where: tripAccessWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      heroImageUrl: true,
      startDate: true,
      _count: { select: { days: true } },
    },
  });
}

export async function getTripById(tripId: string, userId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessWhere(userId) },
    include: tripInclude,
  });
}

export async function createTrip(userId: string, data: TripCreateData) {
  if (data.vehicleId) {
    await assertVehicleBelongsToUser(data.vehicleId, userId);
  }

  return prisma.trip.create({
    data: {
      userId,
      vehicleId: data.vehicleId ?? null,
      name: data.name.trim() || "Untitled trip",
      description: data.description?.trim() || null,
      startDate: toDateOrNull(data.startDate),
    },
    include: tripInclude,
  });
}

export async function updateTrip(
  tripId: string,
  userId: string,
  data: TripUpdateData,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!trip) return null;

  if (data.vehicleId) {
    await assertVehicleBelongsToUser(data.vehicleId, userId);
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      vehicleId: data.vehicleId === undefined ? undefined : data.vehicleId,
      name: data.name?.trim(),
      description:
        data.description === undefined ? undefined : data.description || null,
      startDate:
        data.startDate === undefined ? undefined : toDateOrNull(data.startDate),
      heroImageUrl:
        data.heroImageUrl === undefined ? undefined : data.heroImageUrl,
    },
    select: { id: true, name: true, heroImageUrl: true },
  });
}

export async function canAccessTrip(tripId: string, userId: string) {
  return Boolean(
    await prisma.trip.findFirst({
      where: { id: tripId, ...tripAccessWhere(userId) },
      select: { id: true },
    }),
  );
}

export async function canWriteTrip(tripId: string, userId: string) {
  return Boolean(
    await prisma.trip.findFirst({
      where: { id: tripId, ...tripWriteAccessWhere(userId) },
      select: { id: true },
    }),
  );
}

export async function deleteTrip(tripId: string, userId: string) {
  const result = await prisma.trip.deleteMany({
    where: { id: tripId, userId },
  });

  return result.count > 0;
}

export async function addTripMember(
  tripId: string,
  ownerId: string,
  memberUserId: string,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: ownerId },
    select: { id: true, userId: true },
  });
  if (!trip) return null;
  if (trip.userId === memberUserId) {
    throw new Error("Owner already has access.");
  }

  return prisma.tripMember.upsert({
    where: { tripId_userId: { tripId, userId: memberUserId } },
    update: {},
    create: { tripId, userId: memberUserId },
  });
}

export async function removeTripMember(
  tripId: string,
  ownerId: string,
  memberId: string,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: ownerId },
    select: { id: true },
  });
  if (!trip) return false;

  const result = await prisma.tripMember.deleteMany({
    where: { id: memberId, tripId },
  });

  return result.count > 0;
}

export async function updateTripMemberRole(
  tripId: string,
  ownerId: string,
  memberId: string,
  role: string,
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: ownerId },
    select: { id: true },
  });
  if (!trip) return false;

  const result = await prisma.tripMember.updateMany({
    where: { id: memberId, tripId },
    data: { role },
  });

  return result.count > 0;
}

async function assertVehicleBelongsToUser(vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    select: { id: true },
  });

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }
}
