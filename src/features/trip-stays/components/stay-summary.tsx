import { BedDouble, CarFront, Moon, Route, TentTree } from "lucide-react";

import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";

const STAY_SUMMARY_TYPES = [
  {
    type: "hotel",
    label: "Hotel",
    icon: BedDouble,
    color: "#6E9BC0",
    bg: "#E8F0F6",
  },
  {
    type: "tent",
    label: "Tent",
    icon: TentTree,
    color: "#2E7A57",
    bg: "#E1EFE7",
  },
  {
    type: "car",
    label: "Car",
    icon: CarFront,
    color: "#B8431F",
    bg: "#FBE7DD",
  },
  {
    type: "driving_overnight",
    label: "Overnight drive",
    icon: Route,
    color: "#6B5835",
    bg: "#F6EEDC",
  },
] as const;

export function StaySummary({ stays }: { stays: TripStayPlain[] }) {
  const booked = stays.filter(
    (stay) => stay.status === "booked" || stay.status === "paid",
  ).length;
  const totalCost = stays.reduce((sum, stay) => sum + (stay.price ?? 0), 0);

  return (
    <section className="mb-[22px] rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Moon className="size-4 text-[#6E9BC0]" />
            <h2 className="font-['Bricolage_Grotesque'] text-lg font-bold tracking-[-0.02em]">
              Nights
            </h2>
          </div>
          <p className="text-[13px] font-medium text-[#8a8270]">
            Accommodation across the whole trip
          </p>
        </div>
        <div className="text-right">
          <div className="font-['JetBrains_Mono'] text-3xl font-bold leading-none text-[#16130D]">
            {stays.length}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#948b76]">
            nights planned
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STAY_SUMMARY_TYPES.map(({ type, label, icon: Icon, color, bg }) => {
          const count = stays.filter((stay) => stay.stayType === type).length;
          return (
            <div
              key={type}
              className="rounded-[15px] border border-[#EFE8D8] bg-white p-3.5"
            >
              <div
                className="mb-3 grid size-9 place-items-center rounded-[10px]"
                style={{ color, background: bg }}
              >
                <Icon className="size-4" />
              </div>
              <div className="font-['JetBrains_Mono'] text-2xl font-bold leading-none">
                {count}
              </div>
              <div className="mt-1.5 text-xs font-semibold text-[#7a7264]">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {stays.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-[#EFE8D8] pt-4 text-xs font-semibold text-[#7a7264]">
          <span>{booked} booked or paid</span>
          <span>
            {Math.round(totalCost).toLocaleString("pl-PL")} PLN accommodation
            cost
          </span>
        </div>
      )}
    </section>
  );
}
