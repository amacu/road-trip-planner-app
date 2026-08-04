import type { Metadata } from "next";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";

import { AppLogo, LogoMark } from "@/components/shared/app-logo";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password - RoadTrip Planner",
  description: "Request a RoadTrip Planner password recovery link.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#EEE8DC] p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(22,19,13,.055)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative grid min-h-[min(720px,calc(100dvh-40px))] w-full max-w-[1080px] overflow-hidden rounded-[26px] border border-[#DED3C0] bg-[#FFFCF6] shadow-[0_35px_90px_-45px_rgba(22,19,13,.55)] lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative hidden overflow-hidden bg-[#E4562A] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] bg-[length:22px_22px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-28 size-[390px] rounded-full border-[70px] border-white/[.07]" />
          <AppLogo className="relative z-10 brightness-0 invert" />

          <div className="relative z-10">
            <span className="grid size-14 place-items-center rounded-[16px] border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm">
              <KeyRound className="size-6" />
            </span>
            <h1 className="mt-6 font-['Bricolage_Grotesque'] text-[44px] font-extrabold leading-[.98] tracking-[-0.04em] xl:text-[50px]">
              A quick pit stop.
            </h1>
            <p className="mt-4 max-w-[360px] text-[15px] font-semibold leading-relaxed text-white/75">
              We’ll help you get back into your account and onto your next
              route.
            </p>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 rounded-[13px] border border-white/15 bg-black/10 px-4 py-3 text-xs font-bold">
              <MailCheck className="size-4" />
              Secure link sent by email
            </div>
            <div className="flex items-center gap-3 rounded-[13px] border border-white/15 bg-black/10 px-4 py-3 text-xs font-bold">
              <ShieldCheck className="size-4" />
              Your password stays private
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <AppLogo />
              <LogoMark className="size-10" />
            </div>
            <ForgotPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
