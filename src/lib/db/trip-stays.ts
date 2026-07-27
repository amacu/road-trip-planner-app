import { Prisma } from "@prisma/client";

import { tripWriteAccessWhere } from "@/lib/db/trip-access";
import { prisma } from "@/lib/prisma";
import type {
  TripStayInput,
  TripStayUpdateInput,
} from "@/lib/validators/trip-stay";

function stayData(data: TripStayInput | TripStayUpdateInput) {
  return {
    name: data.name?.trim(),
    stayType: data.stayType,
    status: data.status,
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
    countryCode:
      data.countryCode === undefined
        ? undefined
        : data.countryCode?.toUpperCase() || null,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    price:
      data.price === undefined
        ? undefined
        : data.price === null
          ? null
          : new Prisma.Decimal(data.price),
    currency: data.currency,
    bookingUrl:
      data.bookingUrl === undefined
        ? undefined
        : data.bookingUrl?.trim() || null,
    confirmation: data.confirmation,
    notes: data.notes,
  };
}

export async function upsertTripStay(
  tripId: string,
  userId: string,
  data: TripStayInput,
) {
  const day = await prisma.tripDay.findFirst({
    where: { id: data.afterDayId, tripId, trip: tripWriteAccessWhere(userId) },
    select: {
      id: true,
      stops: {
        orderBy: { stopOrder: "desc" },
        take: 1,
        select: {
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          countryCode: true,
        },
      },
    },
  });
  if (!day) return null;

  const lastStop = day.stops[0];
  const shouldUseLastStop =
    data.stayType !== "driving_overnight" &&
    (data.latitude == null || data.longitude == null);
  const resolvedData: TripStayInput = shouldUseLastStop
    ? {
        ...data,
        address: lastStop?.address || lastStop?.name || data.address,
        latitude: lastStop?.latitude?.toNumber() ?? null,
        longitude: lastStop?.longitude?.toNumber() ?? null,
        countryCode: lastStop?.countryCode ?? data.countryCode,
      }
    : data;

  return prisma.tripStay.upsert({
    where: { afterDayId: data.afterDayId },
    create: {
      tripId,
      afterDayId: data.afterDayId,
      ...stayData(resolvedData),
      name: resolvedData.name.trim(),
      stayType: resolvedData.stayType,
    },
    update: stayData(resolvedData),
  });
}

export async function updateTripStay(
  stayId: string,
  userId: string,
  data: TripStayUpdateInput,
) {
  const stay = await prisma.tripStay.findFirst({
    where: { id: stayId, trip: tripWriteAccessWhere(userId) },
    select: { id: true },
  });
  if (!stay) return null;
  return prisma.tripStay.update({
    where: { id: stayId },
    data: stayData(data),
  });
}

export async function deleteTripStay(stayId: string, userId: string) {
  const result = await prisma.tripStay.deleteMany({
    where: { id: stayId, trip: tripWriteAccessWhere(userId) },
  });
  return result.count > 0;
}
