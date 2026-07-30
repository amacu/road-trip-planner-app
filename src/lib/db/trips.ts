import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { tripAccessWhere, tripWriteAccessWhere } from "@/lib/db/trip-access";
import { toDateOrNull } from "@/lib/db/utils";

export type TripCreateData = {
  vehicleId?: string | null;
  name: string;
  description?: string | null;
  startDate?: string | Date | null;
  dayCount?: number | null;
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
} satisfies Prisma.TripInclude;

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

  const dayCount = data.dayCount ?? null;
  return prisma.trip.create({
    data: {
      userId,
      vehicleId: data.vehicleId ?? null,
      name: data.name.trim() || "Untitled trip",
      description: data.description?.trim() || null,
      startDate: toDateOrNull(data.startDate),
      dayCount,
      days: {
        create: Array.from({ length: dayCount ?? 0 }, (_, index) => ({
          dayNumber: index + 1,
        })),
      },
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

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM trips WHERE id = ${tripId}::uuid FOR UPDATE`;

    const updated = await tx.trip.update({
      where: { id: tripId },
      data: {
        vehicleId: data.vehicleId === undefined ? undefined : data.vehicleId,
        name: data.name?.trim(),
        description:
          data.description === undefined ? undefined : data.description || null,
        startDate:
          data.startDate === undefined
            ? undefined
            : toDateOrNull(data.startDate),
        dayCount: data.dayCount,
        heroImageUrl:
          data.heroImageUrl === undefined ? undefined : data.heroImageUrl,
      },
      select: { id: true, name: true, heroImageUrl: true },
    });

    if (typeof data.dayCount === "number") {
      const currentDays = await tx.tripDay.findMany({
        where: { tripId },
        orderBy: { dayNumber: "asc" },
        select: { id: true, dayNumber: true },
      });
      if (currentDays.length > data.dayCount) {
        await tx.tripDay.deleteMany({
          where: {
            id: { in: currentDays.slice(data.dayCount).map((day) => day.id) },
          },
        });
      } else if (currentDays.length < data.dayCount) {
        await tx.tripDay.createMany({
          data: Array.from(
            { length: data.dayCount - currentDays.length },
            (_, index) => ({
              tripId,
              dayNumber: currentDays.length + index + 1,
            }),
          ),
        });
      }
    }

    return updated;
  });
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

export async function duplicateTrip(tripId: string, userId: string) {
  const source = await prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessWhere(userId) },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          stayAfter: true,
          stops: {
            orderBy: { stopOrder: "asc" },
            include: {
              activities: { orderBy: { activityOrder: "asc" } },
            },
          },
        },
      },
      packingItems: { orderBy: { itemOrder: "asc" } },
    },
  });
  if (!source) return null;

  return prisma.$transaction(
    async (tx) => {
      const copy = await tx.trip.create({
        data: {
          userId,
          vehicleId: source.vehicleId,
          name: `${source.name} Copy`,
          description: source.description,
          startDate: source.startDate,
          dayCount: source.dayCount,
          heroImageUrl: source.heroImageUrl,
          packingCategories:
            source.packingCategories === null
              ? Prisma.JsonNull
              : source.packingCategories,
        },
        select: { id: true, name: true, heroImageUrl: true },
      });

      for (const sourceDay of source.days) {
        const day = await tx.tripDay.create({
          data: {
            tripId: copy.id,
            dayNumber: sourceDay.dayNumber,
            date: sourceDay.date,
            name: sourceDay.name,
            startTime: sourceDay.startTime,
            notes: sourceDay.notes,
          },
          select: { id: true },
        });

        for (const sourceStop of sourceDay.stops) {
          const stop = await tx.tripStop.create({
            data: {
              tripId: copy.id,
              tripDayId: day.id,
              stopOrder: sourceStop.stopOrder,
              name: sourceStop.name,
              address: sourceStop.address,
              latitude: sourceStop.latitude,
              longitude: sourceStop.longitude,
              googleMapsUrl: sourceStop.googleMapsUrl,
              placeId: sourceStop.placeId,
              countryCode: sourceStop.countryCode,
              stopType: sourceStop.stopType,
              travelMode: sourceStop.travelMode,
              startTime: sourceStop.startTime,
              endTime: sourceStop.endTime,
              category: sourceStop.category,
              description: sourceStop.description,
              visitDurationMin: sourceStop.visitDurationMin,
              notes: sourceStop.notes,
            },
            select: { id: true },
          });

          if (sourceStop.activities.length > 0) {
            await tx.tripActivity.createMany({
              data: sourceStop.activities.map((activity) => ({
                tripId: copy.id,
                tripDayId: day.id,
                tripStopId: stop.id,
                activityOrder: activity.activityOrder,
                title: activity.title,
                address: activity.address,
                latitude: activity.latitude,
                longitude: activity.longitude,
                googleMapsUrl: activity.googleMapsUrl,
                placeId: activity.placeId,
                description: activity.description,
                startTime: activity.startTime,
                endTime: activity.endTime,
                category: activity.category,
              })),
            });
          }
        }

        if (sourceDay.stayAfter) {
          const stay = sourceDay.stayAfter;
          await tx.tripStay.create({
            data: {
              tripId: copy.id,
              afterDayId: day.id,
              name: stay.name,
              stayType: stay.stayType,
              status: stay.status,
              address: stay.address,
              latitude: stay.latitude,
              longitude: stay.longitude,
              countryCode: stay.countryCode,
              checkInTime: stay.checkInTime,
              checkOutTime: stay.checkOutTime,
              price: stay.price,
              currency: stay.currency,
              bookingUrl: stay.bookingUrl,
              confirmation: stay.confirmation,
              notes: stay.notes,
            },
          });
        }
      }

      if (source.packingItems.length > 0) {
        await tx.tripPackingItem.createMany({
          data: source.packingItems.map((item) => ({
            tripId: copy.id,
            name: item.name,
            category: item.category,
            acquisition: item.acquisition,
            quantity: item.quantity,
            notes: item.notes,
            price: item.price,
            productLinks:
              item.productLinks === null ? Prisma.JsonNull : item.productLinks,
            isPurchased: item.isPurchased,
            isPacked: item.isPacked,
            itemOrder: item.itemOrder,
          })),
        });
      }

      return copy;
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );
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
