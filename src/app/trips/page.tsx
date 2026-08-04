import { TripsOverview } from "@/features/trips/components/trips-overview";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { withDatabaseRetry } from "@/lib/db/retry";
import { getTripsOverviewItems } from "@/lib/db/trips";

export const metadata = {
  title: "All trips — Tripzo",
  description: "Browse and manage all your road trips.",
};

export default async function TripsPage() {
  const user = await requireAuthenticatedUser();
  const trips = await withDatabaseRetry(() => getTripsOverviewItems(user.id));
  const metadata = user.user_metadata ?? {};

  return (
    <TripsOverview
      currentUserId={user.id}
      userAvatarUrl={
        typeof metadata.avatar_url === "string" ? metadata.avatar_url : null
      }
      trips={trips.map((trip) => ({
        id: trip.id,
        ownerId: trip.userId,
        name: trip.name,
        description: trip.description,
        heroImageUrl: trip.heroImageUrl,
        startDate: trip.startDate?.toISOString().slice(0, 10) ?? null,
        dayCount: trip._count.days || trip.dayCount || 0,
        stopCount: trip._count.stops,
        memberCount: trip._count.members + 1,
        updatedAt: trip.updatedAt.toISOString(),
        firstStop: trip.days.flatMap((day) => day.stops)[0]?.name ?? null,
        lastStop: trip.days.flatMap((day) => day.stops).at(-1)?.name ?? null,
      }))}
    />
  );
}
