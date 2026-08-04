import type { Metadata } from "next";
import { Check, MapPin, Navigation, Route } from "lucide-react";

import { AppLogo, LogoMark } from "@/components/shared/app-logo";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Sign in - RoadTrip Planner",
  description: "Sign in to your RoadTrip Planner account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await redirectIfAuthenticated();
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#EEE8DC] p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(22,19,13,.055)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative grid min-h-[min(760px,calc(100dvh-40px))] w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-[#DED3C0] bg-[#FFFCF6] shadow-[0_35px_90px_-45px_rgba(22,19,13,.55)] lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-[#16130D] p-9 text-[#FFF9EF] lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] bg-[length:22px_22px]" />
          <div className="pointer-events-none absolute -right-32 -top-28 size-[420px] rounded-full bg-[#E4562A]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-28 size-[380px] rounded-full bg-[#2E7A57]/20 blur-3xl" />

          <AppLogo className="relative z-10 brightness-0 invert" />

          <div className="relative z-10 my-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#D0C7B8]">
              <Navigation className="size-3.5 text-brand" />
              Your next trip starts here
            </div>
            <h1 className="max-w-[430px] font-['Bricolage_Grotesque'] text-[46px] font-extrabold leading-[.96] tracking-[-0.045em] xl:text-[56px]">
              Plan less.
              <br />
              <span className="text-[#F17A54]">Drive farther.</span>
            </h1>
            <p className="mt-5 max-w-[390px] text-[15px] font-medium leading-relaxed text-[#BDB4A5]">
              Turn a rough idea into a day-by-day road trip with routes, stays
              and everything you need along the way.
            </p>

            <div className="relative mt-10 h-[190px] rounded-[20px] border border-white/10 bg-white/[.045] p-5 backdrop-blur-sm">
              <div className="absolute left-[15%] top-[58%] h-0 w-[68%] -rotate-[8deg] border-t-2 border-dashed border-white/20" />
              <RoutePoint
                className="left-[9%] top-[48%]"
                label="Start"
                tone="orange"
              />
              <RoutePoint
                className="left-[42%] top-[23%]"
                label="Explore"
                tone="blue"
              />
              <RoutePoint
                className="right-[8%] top-[40%]"
                label="Arrive"
                tone="green"
              />
              <div className="absolute bottom-4 left-5 flex items-center gap-2 text-[10px] font-bold text-[#AFA697]">
                <Route className="size-3.5" />
                One route. Every detail.
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-5 text-[11px] font-bold text-[#AFA697]">
            {["Day-by-day routes", "Stays", "Packing"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[#70B990]" />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 items-center justify-center p-5 sm:p-10 lg:p-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <AppLogo />
              <LogoMark className="size-10" />
            </div>
            <LoginForm nextPath={safeNext} />
          </div>
        </section>
      </div>
    </main>
  );
}

function RoutePoint({
  className,
  label,
  tone,
}: {
  className: string;
  label: string;
  tone: "orange" | "blue" | "green";
}) {
  const colors = {
    orange: "bg-[#E4562A]",
    blue: "bg-[#6E9BC0]",
    green: "bg-[#2E7A57]",
  };
  return (
    <div className={`absolute ${className}`}>
      <span
        className={`grid size-9 place-items-center rounded-[11px] border-2 border-[#262219] text-white shadow-lg ${colors[tone]}`}
      >
        <MapPin className="size-4" />
      </span>
      <span className="mt-1.5 block -translate-x-1/4 text-[9px] font-black uppercase tracking-[0.08em] text-[#C7BEAF]">
        {label}
      </span>
    </div>
  );
}
