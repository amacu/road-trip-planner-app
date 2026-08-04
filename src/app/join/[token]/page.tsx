import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";
import { joinTripByInviteToken } from "@/lib/db/trips";

export default async function JoinTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const tripId = await joinTripByInviteToken(token, user.id);
  if (!tripId) redirect("/?invite=invalid");

  redirect(`/trips/${tripId}`);
}
