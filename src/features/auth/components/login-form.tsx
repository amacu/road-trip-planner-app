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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSupabaseBrowserClient,
  setAuthStoragePersistence,
} from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    try {
      setAuthStoragePersistence(data.rememberMe);
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  }

  return (
    <div className="w-full max-w-[440px] rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <AppLogo />
        <h1 className="mt-7 text-3xl font-black tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Sign in to your account
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11 rounded-lg bg-white"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RememberMeCheckbox register={register} />
          <Label
            htmlFor="remember"
            className="cursor-pointer text-sm font-medium text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        <AuthButton
          type="submit"
          loading={isSubmitting}
          loadingText="Signing in..."
        >
          Sign in
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to RoadTrip Planner?{" "}
        <Link href="/register" className="font-bold text-brand hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}

function RememberMeCheckbox({
  register,
}: {
  register: ReturnType<typeof useForm<LoginInput>>["register"];
}) {
  const { onChange, ...field } = register("rememberMe");
  return (
    <Checkbox
      id="remember"
      defaultChecked
      onCheckedChange={(checked) =>
        onChange({ target: { name: field.name, value: checked === true } })
      }
    />
  );
}
