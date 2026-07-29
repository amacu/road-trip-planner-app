import { Check, MapPinned } from "lucide-react";

import { cn } from "@/lib/utils";

export function TripSummaryCard({
  dayCount,
  active,
  onSelect,
}: {
  dayCount: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        title="Show the whole trip on the map"
        className={cn(
          "flex h-[76px] w-[62px] shrink-0 snap-start flex-col items-center justify-center rounded-[13px] border px-1 text-center shadow-[0_4px_12px_rgba(22,19,13,0.05)] sm:w-[68px] lg:hidden",
          active
            ? "border-[#16130D] bg-[#16130D] text-[#F3EDE1]"
            : "border-[#DED3C0] bg-[#FAF6EE] text-[#B45A3C]",
        )}
      >
        <MapPinned className="size-5" strokeWidth={2.2} />
        <span
          className={cn(
            "mt-1.5 text-[9px] font-black leading-tight",
            active ? "text-brand" : "text-[#6F685B]",
          )}
        >
          Whole trip
        </span>
      </button>

      <button
        type="button"
        onClick={onSelect}
        title="Show the whole trip on the map"
        className={cn(
          "group hidden w-full grid-cols-[16px_45px_minmax(0,1fr)] items-center gap-2.5 rounded-[20px] border px-3 py-3.5 text-left shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200 lg:grid",
          active
            ? "border-[#16130D] bg-[#16130D] text-[#F3EDE1] shadow-[0_12px_28px_rgba(22,19,13,0.18)]"
            : "border-[#DED3C0] bg-[#FAF6EE] hover:-translate-y-0.5 hover:border-[#CDBFA6] hover:bg-[#FCF8F1] hover:shadow-[0_10px_24px_rgba(22,19,13,0.09)]",
        )}
      >
        <span className="hidden place-items-center lg:grid" aria-hidden>
          <span
            className={cn(
              "size-2 rounded-full border-[1.5px]",
              active
                ? "border-brand bg-brand"
                : "border-[#B8AE98]/80 bg-[#FBF8F1]",
            )}
          />
        </span>

        <span
          className={cn(
            "flex h-11 items-center justify-center border-r pr-2.5 lg:h-12",
            active
              ? "border-white/10 text-brand"
              : "border-[#E7DFCE] text-[#B45A3C]",
          )}
        >
          <MapPinned className="size-5" strokeWidth={2.25} />
        </span>

        <span className="min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-black leading-tight">
              Whole trip
            </span>
            {active && <Check className="size-4 shrink-0 text-brand" />}
          </span>
          <span
            className={cn(
              "mt-1 block truncate text-[11.5px] font-semibold lg:mt-1.5 lg:text-[12.5px]",
              active ? "text-[#C9C0AD]" : "text-muted-foreground",
            )}
          >
            Show the complete route
          </span>
          <span
            className={cn(
              "mt-1.5 block font-mono text-[10px] font-bold lg:mt-2 lg:text-[10.5px]",
              active ? "text-[#948B76]" : "text-[#9A917F]",
            )}
          >
            {dayCount} {dayCount === 1 ? "day" : "days"} · All stops
          </span>
        </span>
      </button>
    </>
  );
}
