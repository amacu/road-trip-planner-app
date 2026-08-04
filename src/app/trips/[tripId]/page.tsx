import { notFound } from "next/navigation";

import { PlannerView } from "@/features/trips/components/planner-view";
import {
  toTripPlain,
  toUserProfilePlain,
  toVehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getCachedFuelPriceCountries } from "@/lib/db/fuel-prices";
import { withDatabaseRetry } from "@/lib/db/retry";
import { getUserProfileByUserId } from "@/lib/db/user-profiles";
import { getTripById, getTripSwitcherItems } from "@/lib/db/trips";
import { getVehicles } from "@/lib/db/vehicles";

export async function generateMetadata() {
  return {
    title: "Trip Planner — RoadTrip Planner",
    description: "Plan travel days, stops, and route.",
  };
}

export default async function TripPlannerPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireAuthenticatedUser();
  const [trip, vehicles, trips, fuelPrices] = await withDatabaseRetry(() =>
    Promise.all([
      getTripById(tripId, user.id),
      getVehicles(user.id),
      getTripSwitcherItems(user.id),
      getCachedFuelPriceCountries(),
    ]),
  );

  if (!trip) notFound();
  const userMetadata = user.user_metadata ?? {};
  const ownerProfile =
    trip.userId === user.id
      ? {
          userId: user.id,
          email: user.email ?? "",
          username:
            typeof userMetadata.username === "string"
              ? userMetadata.username
              : null,
        }
      : await withDatabaseRetry(() => getUserProfileByUserId(trip.userId));
  const plainTrip = toTripPlain(trip);

  return (
    <PlannerView
      key={trip.id}
      trip={{
        ...plainTrip,
        ownerProfile: ownerProfile ? toUserProfilePlain(ownerProfile) : null,
      }}
      vehicles={vehicles.map(toVehiclePlain)}
      trips={trips.map((item) => ({
        id: item.id,
        name: item.name,
        heroImageUrl: item.heroImageUrl,
        startDate: item.startDate
          ? item.startDate.toISOString().slice(0, 10)
          : null,
        dayCount: item._count.days,
      }))}
      initialFuelPrices={fuelPrices}
      currentUserId={user.id}
      currentUserAvatarUrl={
        typeof userMetadata.avatar_url === "string"
          ? userMetadata.avatar_url
          : null
      }
    />
  );
}
