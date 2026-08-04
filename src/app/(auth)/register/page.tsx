import type { Metadata } from "next";
import { Check, Compass, MapPinned, Route } from "lucide-react";

import { AppLogo, LogoMark } from "@/components/shared/app-logo";
import { RegisterForm } from "@/features/auth/components/register-form";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create Account - RoadTrip Planner",
  description: "Create your RoadTrip Planner account.",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#EEE8DC] p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(22,19,13,.055)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative grid min-h-[min(800px,calc(100dvh-40px))] w-full max-w-[1200px] overflow-hidden rounded-[26px] border border-[#DED3C0] bg-[#FFFCF6] shadow-[0_35px_90px_-45px_rgba(22,19,13,.55)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#213E31] p-10 text-[#FFF9EF] lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:22px_22px]" />
          <div className="pointer-events-none absolute -right-36 top-20 size-[430px] rounded-full border-[80px] border-[#70B990]/10" />
          <div className="pointer-events-none absolute -bottom-36 -left-20 size-[350px] rounded-full bg-[#E4562A]/15 blur-3xl" />
          <AppLogo className="relative z-10 brightness-0 invert" />

          <div className="relative z-10 my-8">
            <span className="grid size-14 place-items-center rounded-[16px] border border-white/15 bg-white/10 shadow-lg backdrop-blur-sm">
              <Compass className="size-6 text-[#8ED0AA]" />
            </span>
            <h1 className="mt-6 max-w-[420px] font-['Bricolage_Grotesque'] text-[45px] font-extrabold leading-[.97] tracking-[-0.045em] xl:text-[54px]">
              Your best road trips start with a plan.
            </h1>
            <p className="mt-5 max-w-[390px] text-[15px] font-medium leading-relaxed text-white/65">
              Build the route, organize every day and keep the whole journey in
              one beautifully simple place.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              <Feature icon={Route} label="Smart itineraries" />
              <Feature icon={MapPinned} label="Interactive maps" />
              <Feature icon={Check} label="Packing lists" />
              <Feature icon={Compass} label="One travel hub" />
            </div>
          </div>

          <p className="relative z-10 text-[11px] font-bold text-white/45">
            Free to start · Built for the open road
          </p>
        </section>

        <section className="flex items-center justify-center overflow-y-auto p-5 sm:p-10 lg:p-12">
          <div className="w-full max-w-[470px] py-4">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <AppLogo />
              <LogoMark className="size-10" />
            </div>
            <RegisterForm />
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Route; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-white/10 bg-white/[.06] px-3 py-3 text-xs font-bold text-white/80">
      <Icon className="size-4 shrink-0 text-[#8ED0AA]" />
      {label}
    </div>
  );
}
