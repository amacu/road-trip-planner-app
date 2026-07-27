"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/shared/app-logo";
import { AuthButton } from "@/features/auth/components/auth-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(input: ForgotPasswordInput) {
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      input.email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );
    if (resetError) {
      setError("Could not send a recovery email. Please try again.");
      return;
    }
    setMessage(
      "If an account exists for this address, a recovery link has been sent.",
    );
  }

  return (
    <div className="w-full max-w-[440px] rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <AppLogo />
        <h1 className="mt-7 text-3xl font-black tracking-tight">
          Reset password
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          We&apos;ll email you a secure recovery link.
        </p>
      </div>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="recovery-email">Email</Label>
          <Input
            id="recovery-email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <AuthButton
          type="submit"
          loading={isSubmitting}
          loadingText="Sending..."
        >
          Send recovery link
        </AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-bold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
