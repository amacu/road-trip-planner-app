import type { Metadata } from "next";

import { LogoMark } from "@/components/shared/app-logo";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { requireUser } from "@/lib/auth/guards";
import { toVehiclePlain } from "@/features/trips/lib/trip-view-model";
import { getVehicles } from "@/lib/db/vehicles";

export const metadata: Metadata = {
  title: "Profile - RoadTrip Planner",
  description: "Manage your RoadTrip Planner account settings.",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const vehicles = await getVehicles(user.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-5 py-5 md:px-10 md:py-6">
          <div className="md:hidden">
            <LogoMark className="size-11" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Account settings
            </p>
            <h1 className="font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-none tracking-[-0.03em] md:text-4xl">
              Profile
            </h1>
          </div>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth">
        <div className="mx-auto w-full max-w-[1440px] p-5 pb-10 md:p-10 md:pb-16">
          <ProfileForm user={user} vehicles={vehicles.map(toVehiclePlain)} />
        </div>
      </main>
    </div>
  );
}
