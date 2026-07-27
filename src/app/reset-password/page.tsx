import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Choose a new password - RoadTrip Planner",
};

export default async function ResetPasswordPage() {
  if (!(await getCurrentUser())) redirect("/forgot-password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <ResetPasswordForm />
    </div>
  );
}
