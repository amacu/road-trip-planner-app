"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

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

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
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

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  }

  return (
    <div className="w-full">
      <div>
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-brand">
          Welcome back
        </div>
        <h1 className="font-['Bricolage_Grotesque'] text-[36px] font-extrabold leading-none tracking-[-0.035em] text-[#16130D] sm:text-[42px]">
          Continue your journey
        </h1>
        <p className="mt-3 text-sm font-medium text-[#7A7264]">
          Sign in to pick up where you left off.
        </p>
      </div>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black text-[#4F493E]">
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-[52px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-4 font-semibold shadow-none transition focus-visible:border-brand/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand/15"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="password"
              className="text-xs font-black text-[#4F493E]"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-[52px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-4 font-semibold shadow-none transition focus-visible:border-brand/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand/15"
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <RememberMeCheckbox register={register} />
          <Label
            htmlFor="remember"
            className="cursor-pointer text-xs font-bold text-[#6F675A]"
          >
            Keep me signed in
          </Label>
        </div>

        <AuthButton
          type="submit"
          loading={isSubmitting}
          loadingText="Signing in..."
          className="h-[52px] rounded-[13px] text-sm font-black shadow-[0_10px_24px_rgba(228,86,42,0.24)]"
        >
          Sign in
          <ArrowRight className="size-4" />
        </AuthButton>
      </form>

      <div className="mt-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E3DAC8]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A89F88]">
          New here?
        </span>
        <span className="h-px flex-1 bg-[#E3DAC8]" />
      </div>
      <Link
        href="/register"
        className="mt-4 flex h-12 w-full items-center justify-center rounded-[13px] border border-[#D8CEB8] bg-[#FBF8F1] text-sm font-black text-[#302B23] transition hover:border-[#C7B99F] hover:bg-[#F3EDE1]"
      >
        Create a free account
      </Link>
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
      className="size-5 rounded-[6px] border-[#CBBEA6] bg-white text-white shadow-none data-[state=checked]:border-brand data-[state=checked]:bg-brand [&_svg]:size-3.5 [&_svg]:stroke-[3]"
      onCheckedChange={(checked) =>
        onChange({ target: { name: field.name, value: checked === true } })
      }
    />
  );
}
