import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";

export default async function SettingsPage() {
  await requireUser();
  redirect("/profile");
}
