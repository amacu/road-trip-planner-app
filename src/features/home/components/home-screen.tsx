"use client";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Fuel,
  Luggage,
  MapPin,
  MapPinned,
  Menu,
  Navigation,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function HomeScreen({
  onOpenOverview,
  onOpenPlanner,
}: {
  onOpenOverview?: () => void;
  onOpenPlanner?: () => void;
}) {
  const router = useRouter();
  const openApp = onOpenOverview ?? (() => router.push("/login"));
  const openPlanner = onOpenPlanner ?? (() => router.push("/login"));
  const startFree = onOpenPlanner ?? (() => router.push("/register"));

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#F3EDE1] text-[#16130D]">
      <div className="relative overflow-hidden bg-[#16130D] text-[#FFF9EF]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="pointer-events-none absolute -right-40 -top-48 size-[620px] rounded-full bg-[#E4562A]/20 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-72 left-[12%] size-[560px] rounded-full bg-[#2E7A57]/20 blur-[100px]" />

        <nav className="relative z-20 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Image
            src="/logo.png"
            alt="Tripzo"
            width={480}
            height={160}
            priority
            className="h-10 w-auto brightness-0 invert"
          />
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="#product">Product</NavLink>
            <NavLink href="#workflow">How it works</NavLink>
            <NavLink href="#essentials">Travel essentials</NavLink>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openApp}
              className="hidden h-10 items-center rounded-[11px] px-4 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={startFree}
              className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-brand px-4 text-sm font-black text-white shadow-[0_8px_22px_rgba(228,86,42,.28)] transition hover:-translate-y-px hover:bg-[#CF4822]"
            >
              Start a trip
              <ArrowRight className="size-4" />
            </button>
            <Menu className="ml-1 size-5 text-white/60 md:hidden" />
          </div>
        </nav>

        <section className="relative z-10 mx-auto max-w-[1280px] px-5 pb-14 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-[920px] text-center">
            <div className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[.06] px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-[#C7BEAF] backdrop-blur">
              <Navigation className="size-3.5 text-[#F17A54]" />
              Made for multi-day road trips
            </div>
            <h1 className="mt-7 font-['Bricolage_Grotesque'] text-[clamp(48px,8vw,92px)] font-extrabold leading-[.88] tracking-[-.055em]">
              The whole road trip.
              <br />
              <span className="text-[#F17A54]">One clear plan.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-[650px] text-[16px] font-medium leading-relaxed text-[#BDB4A5] sm:text-lg">
              Route every day, organize every stop, book every night and pack
              every bag — without juggling maps, notes and spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={startFree}
                className="inline-flex h-[54px] items-center gap-2 rounded-[13px] bg-brand px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(228,86,42,.3)] transition hover:-translate-y-px hover:bg-[#CF4822]"
              >
                Plan your first trip
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={openPlanner}
                className="inline-flex h-[54px] items-center gap-2 rounded-[13px] border border-white/15 bg-white/[.06] px-5 text-sm font-black text-white transition hover:bg-white/10"
              >
                <Route className="size-4 text-[#8ED0AA]" />
                Open planner
              </button>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-white/50">
              {["Free to start", "No credit card", "Share with your crew"].map(
                (label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Check className="size-3.5 text-[#70B990]" />
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>

          <ProductPreview />
        </section>
      </div>

      <section
        id="product"
        className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <SectionIntro
          eyebrow="One travel workspace"
          title="Everything important stays connected."
          body="The route changes. A night moves. Someone adds a stop. Tripzo keeps the entire plan together instead of scattering updates across five different apps."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          <BentoCard className="lg:col-span-7" tone="orange">
            <div className="flex items-start justify-between gap-4">
              <FeatureTitle icon={Route} label="A real day-by-day itinerary" />
              <span className="rounded-[8px] bg-[#FBE7DD] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.08em] text-[#B8431F]">
                Planner
              </span>
            </div>
            <p className="mt-3 max-w-[520px] text-sm font-medium leading-relaxed text-[#6A6353]">
              Build realistic travel days with ordered stops, drive times,
              activities and overnight stays.
            </p>
            <MiniTimeline />
          </BentoCard>

          <BentoCard className="lg:col-span-5" tone="blue">
            <FeatureTitle icon={MapPinned} label="The map is the workspace" />
            <p className="mt-3 text-sm font-medium leading-relaxed text-[#6A6353]">
              See the entire route at once and keep the current day in the right
              viewport.
            </p>
            <MiniMap />
          </BentoCard>

          <BentoCard className="lg:col-span-4" tone="green">
            <FeatureTitle icon={Fuel} label="Know the cost before departure" />
            <div className="mt-7 font-mono text-[34px] font-black tracking-[-.04em] text-[#276848]">
              620 PLN
            </div>
            <p className="mt-1 text-xs font-bold text-[#789080]">
              Estimated fuel · 1,284 km
            </p>
          </BentoCard>

          <BentoCard className="lg:col-span-4" tone="neutral">
            <FeatureTitle icon={BedDouble} label="Every night accounted for" />
            <div className="mt-6 flex items-center gap-2">
              {["Hotel", "Tent", "Drive"].map((label, index) => (
                <span
                  key={label}
                  className="rounded-[9px] px-2.5 py-2 text-[10px] font-black"
                  style={{
                    background: ["#E2EAE8", "#E3E9DC", "#EAE1CF"][index],
                    color: ["#55747B", "#58705A", "#74613E"][index],
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold text-[#8A8270]">
              6 nights planned · 4 booked
            </p>
          </BentoCard>

          <BentoCard className="lg:col-span-4" tone="purple">
            <FeatureTitle icon={Users} label="One plan for the whole crew" />
            <div className="mt-6 flex items-center">
              {["AM", "KZ", "TR", "+2"].map((label, index) => (
                <span
                  key={label}
                  className={`grid size-10 place-items-center rounded-full border-2 border-[#FBF8F1] text-xs font-black text-white ${index ? "-ml-2" : ""}`}
                  style={{
                    background: ["#E4562A", "#2E7A57", "#6E9BC0", "#8A8270"][
                      index
                    ],
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-[#8A8270]">
              Invite, edit and travel from the same itinerary.
            </p>
          </BentoCard>
        </div>
      </section>

      <section id="workflow" className="border-y border-[#DED3C0] bg-[#FFFCF6]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <SectionIntro
            eyebrow="From idea to ignition"
            title="A plan you can actually follow."
            body="Start loose, add detail as you go, and arrive at a route that makes sense on the road."
          />
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            <WorkflowStep
              number="01"
              icon={MapPin}
              title="Drop in the places"
              body="Add cities, viewpoints, food stops and anything worth the detour."
            />
            <WorkflowStep
              number="02"
              icon={CalendarDays}
              title="Shape each day"
              body="Balance driving, activities and nights into a realistic itinerary."
            />
            <WorkflowStep
              number="03"
              icon={Navigation}
              title="Take it on the road"
              body="Open the route, share the plan and keep every detail close."
            />
          </div>
        </div>
      </section>

      <section
        id="essentials"
        className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="grid items-center gap-10 overflow-hidden rounded-[24px] bg-[#213E31] p-6 text-[#FFF9EF] sm:p-10 lg:grid-cols-[1fr_.9fr] lg:p-14">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#8ED0AA]">
              Travel essentials included
            </div>
            <h2 className="mt-4 max-w-[600px] font-['Bricolage_Grotesque'] text-[38px] font-extrabold leading-[.98] tracking-[-.04em] sm:text-[52px]">
              The route is only half the trip.
            </h2>
            <p className="mt-5 max-w-[520px] text-sm font-medium leading-relaxed text-white/60">
              Keep accommodation, shopping and packing beside the itinerary,
              where they belong.
            </p>
            <button
              type="button"
              onClick={startFree}
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#FFF9EF] px-5 text-sm font-black text-[#213E31] transition hover:-translate-y-px"
            >
              Build your travel hub <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <EssentialCard
              icon={BedDouble}
              title="Nights"
              value="6 / 7"
              color="#6E9BC0"
            />
            <EssentialCard
              icon={Luggage}
              title="Packed"
              value="18 / 24"
              color="#70B990"
            />
            <EssentialCard
              icon={Fuel}
              title="Fuel"
              value="620 zł"
              color="#F17A54"
            />
            <EssentialCard
              icon={Sparkles}
              title="Readiness"
              value="82%"
              color="#D6AF58"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DED3C0] bg-[#FFFCF6]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Image
            src="/logo.png"
            alt="Tripzo"
            width={480}
            height={160}
            className="h-9 w-auto object-contain"
          />
          <p className="text-xs font-semibold text-[#8A8270]">
            Plan clearly. Travel freely.
          </p>
          <button
            type="button"
            onClick={startFree}
            className="inline-flex items-center gap-2 text-xs font-black text-brand"
          >
            Start planning <ArrowRight className="size-3.5" />
          </button>
        </div>
      </footer>
    </main>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-[10px] px-3 py-2 text-sm font-bold text-white/60 transition hover:bg-white/[.07] hover:text-white"
    >
      {children}
    </a>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-[1080px] animate-[rtUp_.8s_.1s_ease_both] rounded-[24px] border border-white/10 bg-[#EEE8DC] p-2 text-[#16130D] shadow-[0_45px_100px_-35px_rgba(0,0,0,.75)] sm:p-3 lg:mt-18">
      <div className="grid min-h-[460px] overflow-hidden rounded-[18px] bg-[#FFFCF6] lg:grid-cols-[250px_360px_1fr]">
        <div className="border-b border-[#DED3C0] p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black">7-day escape</span>
            <span className="rounded-[7px] bg-[#FBE7DD] px-2 py-1 text-[8px] font-black text-brand">
              LIVE
            </span>
          </div>
          <div className="mt-5 flex gap-2 overflow-hidden lg:block lg:space-y-2">
            {[
              ["1", "Warsaw → Prague", "#E4562A"],
              ["2", "Prague → Munich", "#2E7A57"],
              ["3", "Munich → Alps", "#6E9BC0"],
              ["4", "Alpine loop", "#B5502E"],
            ].map(([day, route, color]) => (
              <div
                key={day}
                className="flex min-w-[180px] items-center gap-2.5 rounded-[12px] border border-[#E7DFCE] bg-[#FBF8F1] p-2.5 lg:min-w-0"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-[9px] font-mono text-xs font-black text-white"
                  style={{ background: color }}
                >
                  {day}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-black">
                    {route}
                  </span>
                  <span className="mt-0.5 block text-[8px] font-bold text-[#9A917F]">
                    3 stops · 4h 20m
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden border-r border-[#DED3C0] p-4 lg:block">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">Prague → Munich</span>
            <span className="text-[9px] font-bold text-[#9A917F]">DAY 2</span>
          </div>
          <div className="mt-5 space-y-0">
            {[
              ["08:00", "Prague", "Start"],
              ["11:30", "Pilsen", "Coffee"],
              ["15:10", "Regensburg", "Explore"],
              ["19:00", "Munich", "Night"],
            ].map(([time, place, tag], index) => (
              <div key={place} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="grid size-7 place-items-center rounded-[8px] bg-[#E4562A] font-mono text-[9px] font-black text-white">
                    {index + 1}
                  </span>
                  {index < 3 && (
                    <span className="h-9 border-l border-dashed border-[#CFC5B2]" />
                  )}
                </div>
                <div className="pt-1">
                  <span className="text-[10px] font-black">{place}</span>
                  <span className="ml-2 text-[8px] font-bold text-[#9A917F]">
                    {time} · {tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <PreviewStat icon={Clock3} label="Driving" value="4h 20m" />
            <PreviewStat icon={Fuel} label="Fuel" value="128 zł" />
          </div>
        </div>
        <MiniMap large />
      </div>
    </div>
  );
}

function MiniMap({ large = false }: { large?: boolean }) {
  const points = [
    [20, 72, "#E4562A"],
    [38, 54, "#2E7A57"],
    [57, 61, "#6E9BC0"],
    [76, 34, "#B5502E"],
  ] as const;
  return (
    <div
      className={`relative overflow-hidden bg-[#E8EEE9] ${large ? "min-h-[300px]" : "mt-6 h-[190px] rounded-[14px]"}`}
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(70,100,80,.07)_0_1px,transparent_1px_28px),repeating-linear-gradient(0deg,rgba(70,100,80,.07)_0_1px,transparent_1px_28px)]" />
      <div className="absolute -left-20 -top-16 size-64 rounded-[48%] bg-[#BFD5E0]/55" />
      <div className="absolute right-[-40px] top-[22%] size-44 rounded-[45%] bg-[#D6DEC5]/70" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <path
          d="M20 72 C 32 65, 28 52, 38 54 S 48 70,57 61 S 68 48,76 34"
          fill="none"
          stroke="#E4562A"
          strokeDasharray="1 3"
          strokeLinecap="round"
          strokeWidth="1.3"
        />
      </svg>
      {points.map(([left, top, color], index) => (
        <span
          key={index}
          className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[8px] border-2 border-[#FFFCF6] font-mono text-[8px] font-black text-white shadow-md"
          style={{ left: `${left}%`, top: `${top}%`, background: color }}
        >
          {index + 1}
        </span>
      ))}
      {large && (
        <span className="absolute bottom-4 right-4 rounded-[9px] bg-[#FFFCF6]/90 px-3 py-2 text-[9px] font-black shadow-md backdrop-blur">
          1,284 km · 18h driving
        </span>
      )}
    </div>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] bg-[#F3EDE1] p-2.5">
      <Icon className="size-3 text-brand" />
      <span className="mt-2 block text-[8px] font-bold text-[#9A917F]">
        {label}
      </span>
      <span className="font-mono text-[10px] font-black">{value}</span>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-[720px]">
      <div className="text-[10px] font-black uppercase tracking-[.12em] text-brand">
        {eyebrow}
      </div>
      <h2 className="mt-4 font-['Bricolage_Grotesque'] text-[38px] font-extrabold leading-[.98] tracking-[-.04em] sm:text-[54px]">
        {title}
      </h2>
      <p className="mt-5 max-w-[650px] text-sm font-medium leading-relaxed text-[#6A6353] sm:text-base">
        {body}
      </p>
    </div>
  );
}

function BentoCard({
  children,
  className = "",
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone: "orange" | "blue" | "green" | "neutral" | "purple";
}) {
  const backgrounds = {
    orange: "bg-[#FFF9F5]",
    blue: "bg-[#F5F9FB]",
    green: "bg-[#F4F9F6]",
    neutral: "bg-[#FBF8F1]",
    purple: "bg-[#F8F5FA]",
  };
  return (
    <article
      className={`overflow-hidden rounded-[20px] border border-[#DED3C0] p-5 shadow-[0_7px_22px_rgba(22,19,13,.05)] sm:p-6 ${backgrounds[tone]} ${className}`}
    >
      {children}
    </article>
  );
}

function FeatureTitle({
  icon: Icon,
  label,
}: {
  icon: typeof Route;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#16130D] text-white">
        <Icon className="size-[18px]" />
      </span>
      <h3 className="font-['Bricolage_Grotesque'] text-lg font-bold tracking-[-.02em]">
        {label}
      </h3>
    </div>
  );
}

function MiniTimeline() {
  return (
    <div className="mt-7 grid gap-2 sm:grid-cols-3">
      {[
        ["Prague", "3 stops", "#E4562A"],
        ["Munich", "4 stops", "#2E7A57"],
        ["The Alps", "5 stops", "#6E9BC0"],
      ].map(([place, meta, color], index) => (
        <div
          key={place}
          className="flex items-center gap-2.5 rounded-[12px] border border-[#E7DFCE] bg-white/70 p-3"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-[9px] font-mono text-xs font-black text-white"
            style={{ background: color }}
          >
            {index + 1}
          </span>
          <span>
            <span className="block text-xs font-black">{place}</span>
            <span className="text-[9px] font-bold text-[#9A917F]">{meta}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkflowStep({
  number,
  icon: Icon,
  title,
  body,
}: {
  number: string;
  icon: typeof MapPin;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#E7DFCE] bg-[#FBF8F1] p-5">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-[12px] bg-[#FBE7DD] text-brand">
          <Icon className="size-[18px]" />
        </span>
        <span className="font-mono text-xs font-black text-[#C9BFA9]">
          {number}
        </span>
      </div>
      <h3 className="mt-6 font-['Bricolage_Grotesque'] text-xl font-bold tracking-[-.025em]">
        {title}
      </h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-[#7A7264]">
        {body}
      </p>
      <ChevronRight className="mt-6 size-4 text-brand" />
    </article>
  );
}

function EssentialCard({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: typeof BedDouble;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[.07] p-4 backdrop-blur">
      <Icon className="size-5" style={{ color }} />
      <span className="mt-5 block text-[10px] font-black uppercase tracking-[.08em] text-white/45">
        {title}
      </span>
      <span className="mt-1 block font-mono text-xl font-black">{value}</span>
    </div>
  );
}
