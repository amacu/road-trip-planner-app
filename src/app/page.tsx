import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";
import { HomeScreen } from "@/features/home/components/home-screen";
import { createTrip, getLatestTripId } from "@/lib/db/trips";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <HomeScreen />;
  }

  const firstTrip =
    (await getLatestTripId(user.id)) ??
    (await createTrip(user.id, {
      name: "Untitled trip",
    }));

  redirect(`/trips/${firstTrip.id}`);
}
