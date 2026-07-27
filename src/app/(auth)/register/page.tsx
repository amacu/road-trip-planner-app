import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create Account - RoadTrip Planner",
  description: "Create your RoadTrip Planner account.",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <RegisterForm />
    </div>
  );
}
