import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function flattenBucket(stops) {
  if (!stops.some((stop) => stop.activities.length > 0)) return 0;

  const sequence = stops.flatMap((stop) => [
    { kind: "stop", stop },
    ...stop.activities.map((activity) => ({
      kind: "activity",
      stop,
      activity,
    })),
  ]);

  return prisma.$transaction(async (tx) => {
    for (let index = 0; index < stops.length; index++) {
      await tx.tripStop.update({
        where: { id: stops[index].id },
        data: { stopOrder: 100_000 + index },
      });
    }

    let migrated = 0;
    for (let index = 0; index < sequence.length; index++) {
      const item = sequence[index];
      const stopOrder = index + 1;
      if (item.kind === "stop") {
        await tx.tripStop.update({
          where: { id: item.stop.id },
          data: { stopOrder },
        });
        continue;
      }

      const activity = item.activity;
      await tx.tripStop.create({
        data: {
          tripId: activity.tripId,
          tripDayId: activity.tripDayId,
          stopOrder,
          name: activity.title,
          address: activity.address,
          latitude: activity.latitude
            ? new Prisma.Decimal(activity.latitude)
            : null,
          longitude: activity.longitude
            ? new Prisma.Decimal(activity.longitude)
            : null,
          googleMapsUrl: activity.googleMapsUrl,
          placeId: activity.placeId,
          stopType: "activity",
          travelMode: "walking",
          startTime: activity.startTime,
          endTime: activity.endTime,
          category: activity.category,
          description: activity.description,
          visitDurationMin: null,
          notes: activity.description,
        },
      });
      await tx.tripActivity.delete({ where: { id: activity.id } });
      migrated++;
    }
    return migrated;
  });
}

async function main() {
  const days = await prisma.tripDay.findMany({
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
        include: { activities: { orderBy: { activityOrder: "asc" } } },
      },
    },
  });
  const trips = await prisma.trip.findMany({
    include: {
      stops: {
        where: { tripDayId: null },
        orderBy: { stopOrder: "asc" },
        include: { activities: { orderBy: { activityOrder: "asc" } } },
      },
    },
  });

  let migrated = 0;
  for (const day of days) migrated += await flattenBucket(day.stops);
  for (const trip of trips) migrated += await flattenBucket(trip.stops);
  console.log(`Flattened ${migrated} activities into itinerary items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
