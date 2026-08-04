"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  CircleCheckBig,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthButton } from "@/features/auth/components/auth-button";
import { checkRegistrationAvailabilityAction } from "@/features/auth/actions";
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
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    setServerError("");
    setConfirmationEmail("");
    try {
      const availability = await checkRegistrationAvailabilityAction({
        email: data.email,
        username: data.username,
      });
      if (!availability.success) {
        setServerError(availability.error);
        return;
      }
      if (!availability.data.emailAvailable) {
        setServerError("An account with this email already exists.");
        return;
      }
      if (!availability.data.usernameAvailable) {
        setServerError("That username is already in use.");
        return;
      }

      setAuthStoragePersistence(true);
      const supabase = getSupabaseBrowserClient();
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username.trim().toLowerCase(),
            language: "en",
            currency: "USD",
          },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      if (
        signUpData.user &&
        Array.isArray(signUpData.user.identities) &&
        signUpData.user.identities.length === 0
      ) {
        setServerError("An account with this email already exists.");
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
    <div className="w-full">
      <div>
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#2E7A57]">
          Start exploring
        </div>
        <h1 className="font-['Bricolage_Grotesque'] text-[36px] font-extrabold leading-none tracking-[-0.035em] text-[#16130D] sm:text-[42px]">
          Create your account
        </h1>
        <p className="mt-3 text-sm font-medium text-[#7A7264]">
          Your next great route is only a few details away.
        </p>
      </div>

      {confirmationEmail ? (
        <div className="mt-9">
          <div className="rounded-[18px] border border-[#B9D6C6] bg-[#EAF4EE] p-5 text-[#276848]">
            <span className="grid size-11 place-items-center rounded-[13px] bg-[#D5EBDD]">
              <CircleCheckBig className="size-5" />
            </span>
            <h2 className="mt-5 font-['Bricolage_Grotesque'] text-2xl font-bold tracking-[-0.025em]">
              Check your inbox
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#507363]">
              We sent a confirmation link to
              <strong className="mt-1 block break-all text-[#276848]">
                {confirmationEmail}
              </strong>
            </p>
          </div>
          <p className="mt-4 text-xs font-medium leading-relaxed text-[#8A8270]">
            Click the link in the email to activate your account. You can close
            this page afterwards.
          </p>
          <Link
            href="/login"
            className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#2E7A57] text-sm font-black text-white shadow-[0_10px_24px_rgba(46,122,87,0.22)] transition hover:bg-[#276A4C]"
          >
            Continue to sign in
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-xs font-black text-[#4F493E]"
            >
              Username
            </Label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
              <Input
                id="username"
                autoComplete="username"
                placeholder="roadtripper"
                className="h-[50px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-4 font-semibold shadow-none focus-visible:border-[#2E7A57]/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#2E7A57]/15"
                {...register("username")}
              />
            </div>
            {errors.username && (
              <p className="text-xs font-medium text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="register-email"
              className="text-xs font-black text-[#4F493E]"
            >
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-[50px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-4 font-semibold shadow-none focus-visible:border-[#2E7A57]/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#2E7A57]/15"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="register-password"
                className="text-xs font-black text-[#4F493E]"
              >
                Password
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="h-[50px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-3 font-semibold shadow-none focus-visible:border-[#2E7A57]/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#2E7A57]/15"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm-password"
                className="text-xs font-black text-[#4F493E]"
              >
                Confirm password
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="h-[50px] rounded-[13px] border-[#D8CEB8] bg-[#FBF8F1] pl-11 pr-3 font-semibold shadow-none focus-visible:border-[#2E7A57]/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#2E7A57]/15"
                  {...register("confirmPassword")}
                />
              </div>
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
            loadingText="Creating account..."
            className="mt-1 h-[52px] rounded-[13px] bg-[#2E7A57] text-sm font-black shadow-[0_10px_24px_rgba(46,122,87,0.22)] hover:bg-[#276A4C]"
          >
            Create account
            <ArrowRight className="size-4" />
          </AuthButton>
        </form>
      )}

      {!confirmationEmail && (
        <p className="mt-6 text-center text-xs font-semibold text-[#7A7264]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-black text-[#2E7A57] hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
