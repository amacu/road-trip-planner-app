import type { Metadata } from "next";

import { ProfileForm } from "@/features/profile/components/profile-form";
import { toVehiclePlain } from "@/features/trips/lib/trip-view-model";
import { requireUser } from "@/lib/auth/guards";
import { getVehicles } from "@/lib/db/vehicles";

export const metadata: Metadata = {
  title: "Profile - RoadTrip Planner",
  description: "Manage your RoadTrip Planner account settings.",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const vehicles = await getVehicles(user.id);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#F3EDE1]">
      <ProfileForm user={user} vehicles={vehicles.map(toVehiclePlain)} />
    </main>
  );
}
