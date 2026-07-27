import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Sign in - RoadTrip Planner",
  description: "Sign in to your RoadTrip Planner account.",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <LoginForm />
    </div>
  );
}
