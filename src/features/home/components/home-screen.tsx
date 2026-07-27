"use client";

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
  const stops = [
    { id: 1, left: 26, top: 11.43, color: "#E4562A" },
    { id: 2, left: 33, top: 21.43, color: "#E4562A" },
    { id: 3, left: 27, top: 32.14, color: "#2E7A57" },
    { id: 4, left: 45, top: 44.29, color: "#6E9BC0" },
    { id: 5, left: 59, top: 58.57, color: "#E4562A" },
    { id: 6, left: 73, top: 72.86, color: "#2E7A57" },
    { id: 7, left: 83, top: 87.14, color: "#6E9BC0" },
  ];
  const features = [
    {
      title: "Day-by-day",
      body: "Split any trip into travel days, then drag stops into the right order.",
      color: "#E4562A",
      soft: "#FBE7DD",
      shape: "rounded",
    },
    {
      title: "Live route map",
      body: "Every stop plotted with driving distance and time between them.",
      color: "#6E9BC0",
      soft: "#E8F0F6",
      shape: "rounded-full",
    },
    {
      title: "Fuel estimates",
      body: "Real cost per trip based on your vehicle and local fuel prices.",
      color: "#2E7A57",
      soft: "#E1EFE7",
      shape: "rounded",
    },
    {
      title: "Plan together",
      body: "Invite the crew, assign drivers, and keep one shared itinerary.",
      color: "#E4562A",
      soft: "#FBE7DD",
      shape: "rounded-br-none rounded-full",
    },
  ];

  return (
    <main className="rt-scroll min-h-0 flex-1 overflow-y-auto pb-32">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(22,19,13,.045)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative z-10">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-[26px]">
          <div className="flex items-center gap-[11px]">
            <div className="grid size-[34px] place-items-center rounded-[11px] bg-[#E4562A] shadow-[0_6px_16px_-6px_rgba(228,86,42,.7)]">
              <div className="size-[11px] rounded-full bg-white" />
            </div>
            <span className="font-['Bricolage_Grotesque'] text-[21px] font-extrabold tracking-[-0.03em]">
              Milepost
            </span>
          </div>
          <div className="flex items-center gap-[30px]">
            <div className="hidden gap-[26px] text-[14.5px] font-semibold text-[#5a5346] sm:flex">
              <span>Features</span>
            </div>
            <button
              type="button"
              onClick={openApp}
              className="rounded-full bg-[#16130D] px-5 py-[11px] text-[14.5px] font-bold text-white"
            >
              Open the app
            </button>
          </div>
        </nav>

        <header className="mx-auto grid max-w-[1200px] items-center gap-12 px-8 pb-[30px] pt-10 lg:grid-cols-[1.08fr_.92fr]">
          <div className="animate-[rtUp_.7s_ease_both]">
            <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-[#F3CDBC] bg-[#FBE7DD] py-[7px] pl-2 pr-3.5 text-[12.5px] font-bold tracking-[0.01em] text-[#B8431F]">
              <span className="rounded-full bg-[#E4562A] px-2 py-0.5 text-[11px] text-white">
                NEW
              </span>
              Fuel estimates now country-aware
            </div>
            <h1 className="m-0 mb-[22px] font-['Bricolage_Grotesque'] text-[clamp(48px,6vw,66px)] font-extrabold leading-[0.98] tracking-[-0.035em]">
              Every mile,
              <br />
              mapped before
              <br />
              you <span className="italic text-[#E4562A]">turn the key.</span>
            </h1>
            <p className="mb-8 max-w-[460px] text-lg font-medium leading-[1.55] text-[#5a5346]">
              Plan multi-day road trips day by day, drop your stops on the map,
              and know your driving time and fuel cost before you leave the
              driveway.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={openPlanner}
                className="inline-flex items-center gap-[9px] rounded-[14px] bg-[#E4562A] px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-12px_rgba(228,86,42,.75)]"
              >
                Plan your route{" "}
                <span className="font-mono font-bold">{"->"}</span>
              </button>
            </div>
            <div className="mt-[38px] flex items-center gap-[22px]">
              <div className="flex">
                {[
                  ["MK", "#E4562A"],
                  ["TR", "#2E7A57"],
                  ["AL", "#6E9BC0"],
                ].map(([label, color], index) => (
                  <div
                    key={label}
                    className="grid size-[34px] place-items-center rounded-full border-[2.5px] border-[#F3EDE1] text-xs font-bold text-white"
                    style={{
                      background: color,
                      marginLeft: index ? "-11px" : 0,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <span className="text-[13.5px] font-medium leading-[1.4] text-[#6a6353]">
                Plan together -{" "}
                <strong className="text-[#16130D]">14,000+</strong> travelers
                <br />
                mapping trips this month.
              </span>
            </div>
          </div>

          <div className="animate-[rtUp_.8s_.12s_ease_both]">
            <div className="relative rounded-[26px] border border-[#E7DFCE] bg-[#FBF8F1] p-[22px] shadow-[0_40px_80px_-40px_rgba(22,19,13,.5)]">
              <div className="mb-[18px] flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a89f88]">
                    Featured trip
                  </div>
                  <div className="mt-[3px] font-['Bricolage_Grotesque'] text-[22px] font-bold tracking-[-0.02em]">
                    Pacific Coast Escape
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-[#E4562A]">
                    512
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#a89f88]">
                    MILES
                  </div>
                </div>
              </div>
              <div className="relative h-[300px] overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#EAF1F6_0%,#F3EFE4_55%,#EEF4EC_100%)]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(110,155,192,.06)_0_1px,transparent_1px_26px),repeating-linear-gradient(0deg,rgba(110,155,192,.06)_0_1px,transparent_1px_26px)]" />
                <div className="absolute -left-[60px] -top-10 h-[380px] w-60 rounded-[50%_46%_52%_48%] bg-[rgba(110,155,192,.16)] blur-[1px]" />
                <svg
                  viewBox="0 0 100 140"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path
                    d="M 26 16 L 33 30 L 27 45 L 45 62 L 59 82 L 73 102 L 83 122"
                    fill="none"
                    stroke="#E4562A"
                    strokeDasharray="0.4 3.2"
                    strokeLinecap="round"
                    strokeWidth="1.3"
                  />
                </svg>
                {stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="absolute z-[3] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${stop.left}%`, top: `${stop.top}%` }}
                  >
                    <div
                      className="size-[15px] rounded-full border-[2.5px] border-[#FBF8F1] shadow-[0_3px_8px_-2px_rgba(22,19,13,.4)]"
                      style={{ background: stop.color }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <HomeMiniStat value="6" label="days" />
                <HomeMiniStat value="11h" label="driving" />
                <HomeMiniStat value="$146" label="fuel" accent />
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1200px] px-8 pb-[70px] pt-[46px]">
          <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[20px] border border-[#E7DFCE] bg-[#FBF8F1] px-[22px] py-6"
              >
                <div
                  className="mb-4 grid size-[42px] place-items-center rounded-[13px]"
                  style={{ background: feature.soft }}
                >
                  <div
                    className={"size-[15px] " + feature.shape}
                    style={{ background: feature.color }}
                  />
                </div>
                <div className="mb-[7px] font-['Bricolage_Grotesque'] text-[17px] font-bold tracking-[-0.01em]">
                  {feature.title}
                </div>
                <div className="text-[13.5px] leading-[1.5] text-[#6a6353]">
                  {feature.body}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function HomeMiniStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-[13px] px-[13px] py-[11px] " +
        (accent ? "bg-[#FBE7DD]" : "bg-[#F3EFE4]")
      }
    >
      <div
        className={
          "font-mono text-base font-bold " +
          (accent ? "text-[#E4562A]" : "text-[#16130D]")
        }
      >
        {value}
      </div>
      <div
        className={
          "text-[11px] font-semibold " +
          (accent ? "text-[#B8431F]" : "text-[#8a8270]")
        }
      >
        {label}
      </div>
    </div>
  );
}
