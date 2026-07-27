import { CalendarDays, Clock, Fuel, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDistance, formatDuration } from "@/lib/geo";

export function TripSummaryCard({
  dayCount,
  totalKm,
  totalMin,
  fuelPln,
  active,
  onSelect,
}: {
  dayCount: number;
  totalKm: number;
  totalMin: number;
  fuelPln: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      title="Show the whole trip on the map"
      className={cn(
        "cursor-pointer rounded-[18px] border p-4 shadow-sm transition-all",
        active
          ? "border-[#16130D] bg-[#16130D]"
          : "border-border bg-card hover:border-brand/45 hover:bg-[#fffaf0]",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-black",
            active ? "text-[#F3EDE1]" : "text-foreground",
          )}
        >
          Whole trip
        </span>
        {active && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#c9c0ad]">
            Showing on map
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <SummaryStat
          value={formatDistance(totalKm)}
          tone="distance"
          active={active}
        />
        <SummaryStat
          value={formatDuration(totalMin)}
          tone="drive"
          active={active}
        />
        <SummaryStat value={`${dayCount} days`} tone="days" active={active} />
        <SummaryStat
          value={`${Math.round(fuelPln)} PLN`}
          tone="fuel"
          active={active}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  value,
  tone,
  active,
}: {
  value: string;
  tone: "distance" | "drive" | "days" | "fuel";
  active: boolean;
}) {
  const config =
    tone === "distance"
      ? {
          Icon: Route,
          iconBg: "#FDF1EB",
          iconBorder: "#F3D6C7",
          iconColor: "#E4562A",
        }
      : tone === "drive"
        ? {
            Icon: Clock,
            iconBg: "#E8F2EA",
            iconBorder: "#CFE3D6",
            iconColor: "#2E7A57",
          }
        : tone === "days"
          ? {
              Icon: CalendarDays,
              iconBg: "#F3EFE4",
              iconBorder: "#D8CEB8",
              iconColor: "#8a8270",
            }
          : {
              Icon: Fuel,
              iconBg: "#EEF3F5",
              iconBorder: "#D8E2E6",
              iconColor: "#5E86A3",
            };
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        "min-w-0 rounded-[13px] px-2 py-2",
        active ? "bg-white/10" : "bg-[#F3EFE4]",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-[7px] border"
          style={{
            background: config.iconBg,
            borderColor: config.iconBorder,
            color: config.iconColor,
          }}
        >
          <Icon className="size-3.5" strokeWidth={2.4} />
        </span>
        <span
          className={cn(
            "min-w-0 truncate font-mono text-[12px] font-bold leading-none",
            active ? "text-[#F3EDE1]" : "text-[#16130D]",
          )}
          title={value}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
