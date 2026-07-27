"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AppLogo } from "@/components/shared/app-logo";
import { AuthButton } from "@/features/auth/components/auth-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSupabaseBrowserClient,
  setAuthStoragePersistence,
} from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    setServerError("");
    setConfirmationEmail("");
    try {
      setAuthStoragePersistence(true);
      const supabase = getSupabaseBrowserClient();
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            language: "en",
            currency: "USD",
          },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      if (!signUpData.session) {
        setConfirmationEmail(data.email);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    }
  }

  return (
    <div className="w-full max-w-[480px] rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <AppLogo />
        <h1 className="mt-7 text-3xl font-black tracking-tight">
          Create account
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Start planning road trips with your own account
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {confirmationEmail && (
          <Alert>
            <AlertDescription>
              We sent a confirmation link to {confirmationEmail}. Confirm your
              email, then sign in.
            </AlertDescription>
          </Alert>
        )}
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            autoComplete="name"
            className="h-11 rounded-lg bg-white"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs font-medium text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            className="h-11 rounded-lg bg-white"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className="h-11 rounded-lg bg-white"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="h-11 rounded-lg bg-white"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <AuthButton
          type="submit"
          loading={isSubmitting}
          disabled={Boolean(confirmationEmail)}
          loadingText="Creating account..."
        >
          Create account
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
