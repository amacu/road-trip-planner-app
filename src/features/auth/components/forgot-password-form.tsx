"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CircleCheckBig, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="w-full">
      <div>
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-brand">
          Account recovery
        </div>
        <h1 className="font-['Bricolage_Grotesque'] text-[36px] font-extrabold leading-none tracking-[-0.035em] text-[#16130D] sm:text-[42px]">
          Forgot your password?
        </h1>
        <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-[#7A7264]">
          Enter the email connected to your account and we’ll send you a secure
          recovery link.
        </p>
      </div>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {message && (
          <Alert className="rounded-[13px] border-[#B9D6C6] bg-[#EAF4EE] px-4 py-3 text-[#276848]">
            <CircleCheckBig className="size-4" />
            <AlertDescription className="font-semibold leading-relaxed">
              {message}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label
            htmlFor="recovery-email"
            className="text-xs font-black text-[#4F493E]"
          >
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
            <Input
              id="recovery-email"
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
        <AuthButton
          type="submit"
          loading={isSubmitting}
          loadingText="Sending..."
          className="h-[52px] rounded-[13px] text-sm font-black shadow-[0_10px_24px_rgba(228,86,42,0.24)]"
        >
          Send recovery link
          <ArrowRight className="size-4" />
        </AuthButton>
      </form>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 text-xs font-black text-[#6F675A] transition hover:text-brand"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
