import type { Prisma } from "@prisma/client";

const _tripWithRelationsArgs = {
  include: {
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
  },
} satisfies Prisma.TripDefaultArgs;

export type TripWithRelations = Prisma.TripGetPayload<
  typeof _tripWithRelationsArgs
>;
export type TripDayWithStops = TripWithRelations["days"][number];
export type TripStopRecord = TripDayWithStops["stops"][number];
export type UnassignedTripStopRecord = TripWithRelations["stops"][number];
