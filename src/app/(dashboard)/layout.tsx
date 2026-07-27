import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { requireUser } from "@/lib/auth/guards";
import { ensureUserProfile } from "@/lib/db/user-profiles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  await ensureUserProfile(user);
  const metadata = user.user_metadata ?? {};

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <CollapsedSidebar
        userFullName={
          typeof metadata.full_name === "string" ? metadata.full_name : null
        }
        userEmail={user.email}
        userAvatarUrl={
          typeof metadata.avatar_url === "string" ? metadata.avatar_url : null
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
