"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/shared/app-logo";
import { AuthButton } from "@/features/auth/components/auth-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validators/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(input: ResetPasswordInput) {
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (updateError) {
      setError("The recovery link is invalid or expired. Request a new one.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[440px] rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <AppLogo />
        <h1 className="mt-7 text-3xl font-black tracking-tight">
          Choose a new password
        </h1>
      </div>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">Confirm password</Label>
          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <AuthButton
          type="submit"
          loading={isSubmitting}
          loadingText="Updating..."
        >
          Update password
        </AuthButton>
      </form>
    </div>
  );
}
