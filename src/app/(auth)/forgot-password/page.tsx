import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password - RoadTrip Planner",
  description: "Request a RoadTrip Planner password recovery link.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
