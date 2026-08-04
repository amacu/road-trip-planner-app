import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { requireUser } from "@/lib/auth/guards";
import { getTripSwitcherItems } from "@/lib/db/trips";
import { ensureUserProfile } from "@/lib/db/user-profiles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [, trips] = await Promise.all([
    ensureUserProfile(user),
    getTripSwitcherItems(user.id),
  ]);
  const metadata = user.user_metadata ?? {};

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <CollapsedSidebar
        userAvatarUrl={
          typeof metadata.avatar_url === "string" ? metadata.avatar_url : null
        }
        trips={trips.map((trip) => ({
          id: trip.id,
          name: trip.name,
          heroImageUrl: trip.heroImageUrl,
        }))}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
