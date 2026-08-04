"use client";

import { ChevronDown, ChevronUp, Clock3, Route, Trash2 } from "lucide-react";
import { memo } from "react";

import { formatDistance, formatDuration } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  DayWeatherPill,
  type DayWeatherPoint,
} from "@/features/trips/components/day-weather-pill";

export const DayListCard = memo(function DayListCard({
  dayId,
  dateLabel,
  weekdayLabel,
  index,
  isLast,
  distanceKm,
  driveMin,
  firstStopName,
  lastStopName,
  routePointCount = 0,
  weatherDate,
  weatherPoints,
  isEmpty = false,
  active,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  dayId: string;
  dateLabel: string | null;
  weekdayLabel: string | null;
  index: number;
  isLast: boolean;
  distanceKm: number;
  driveMin: number;
  firstStopName?: string;
  lastStopName?: string;
  routePointCount?: number;
  weatherDate: string | null;
  weatherPoints: DayWeatherPoint[];
  isEmpty?: boolean;
  active: boolean;
  onSelect: (dayId: string) => void;
  onRemove: (dayId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const routeLabel =
    !firstStopName && !lastStopName
      ? isEmpty
        ? "Empty day · Add stops"
        : "Add stops to plan this day"
      : firstStopName === lastStopName
        ? routePointCount > 1
          ? `${firstStopName} · Loop route`
          : firstStopName
        : `${firstStopName ?? "Starting point"} → ${lastStopName ?? "Destination"}`;
  const dateParts = dateLabel?.split(" ") ?? [];
  const calendarDay = dateParts.find((part) => /^\d/.test(part));
  const calendarMonth = dateParts.find((part) => !/^\d/.test(part));

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => onSelect(dayId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect(dayId);
        }}
        className={cn(
          "relative flex h-[76px] w-[62px] shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-[13px] border px-1 py-1.5 text-center transition-all sm:w-[68px] lg:hidden",
          active
            ? cn(
                "border-[#16130D] bg-[#16130D] text-[#F3EDE1]",
                isEmpty && "border-dashed",
              )
            : isEmpty
              ? "border-dashed border-[#E7A58F] bg-[#FFF3E9] text-[#8A5F4D]"
              : "border-[#DED3C0] bg-[#FAF6EE] text-[#746D60]",
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(dayId);
          }}
          className={cn(
            "absolute right-1 top-1 grid size-4 place-items-center rounded-full transition-opacity hover:opacity-100 focus:opacity-100",
            active
              ? "text-[#A89F88] opacity-45 hover:bg-white/10"
              : "pointer-events-none text-[#BB6A4F] opacity-0",
          )}
          title={`Delete Day ${index + 1}`}
          aria-label={`Delete Day ${index + 1}`}
        >
          <Trash2 className="size-2.5" />
        </button>
        <span
          className={cn(
            "text-[7.5px] font-black uppercase tracking-[0.14em]",
            active ? "text-brand" : "text-[#B45A3C]",
          )}
        >
          {calendarMonth ?? "Day"}
        </span>
        <span className="mt-0.5 font-mono text-[18px] font-medium leading-none">
          {calendarDay ?? index + 1}
        </span>
        <span
          className={cn(
            "mt-1 text-[9px] font-black",
            active ? "text-brand" : "text-[#6F685B]",
          )}
        >
          {weekdayLabel ? `${weekdayLabel} · ` : ""}Day {index + 1}
        </span>
      </article>

      <article
        role="button"
        tabIndex={0}
        onClick={() => onSelect(dayId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect(dayId);
        }}
        className={cn(
          "group relative hidden cursor-pointer grid-cols-[16px_45px_minmax(0,1fr)] items-center gap-1 rounded-[20px] border py-3.5 pl-1.5 pr-3 shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200 lg:grid",
          active
            ? cn(
                "border-[#16130D] bg-[#16130D] text-[#F3EDE1] shadow-[0_12px_28px_rgba(22,19,13,0.18)]",
                isEmpty && "border-dashed",
              )
            : isEmpty
              ? "border-dashed border-[#E7A58F] bg-[#FFF3E9] hover:-translate-y-0.5 hover:border-brand hover:bg-[#FDEBDD] hover:shadow-[0_10px_24px_rgba(228,86,42,0.08)]"
              : "border-[#DED3C0] bg-[#FAF6EE] hover:-translate-y-0.5 hover:border-[#CDBFA6] hover:bg-[#FCF8F1] hover:shadow-[0_10px_24px_rgba(22,19,13,0.09)]",
        )}
      >
        <div className="hidden flex-col items-center gap-px lg:flex">
          <MoveButton
            direction="up"
            disabled={index === 0}
            active={active}
            dayNumber={index + 1}
            onClick={() => onMoveUp(index)}
          />
          <span
            className={cn(
              "size-2 rounded-full border-[1.5px] transition-colors",
              active
                ? "border-brand bg-brand"
                : "border-[#B8AE98]/80 bg-[#FBF8F1]",
            )}
            aria-hidden
          />
          <MoveButton
            direction="down"
            disabled={isLast}
            active={active}
            dayNumber={index + 1}
            onClick={() => onMoveDown(index)}
          />
        </div>

        <div
          className={cn(
            "flex h-11 min-w-0 flex-col items-center justify-center border-r pr-2.5 lg:h-12",
            active ? "border-white/10" : "border-[#E7DFCE]",
          )}
        >
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-[0.12em]",
              active ? "text-brand" : "text-[#B45A3C]",
            )}
          >
            {calendarMonth ?? "Day"}
          </span>
          <span
            className={cn(
              "mt-0.5 font-mono text-lg font-medium leading-none",
              active ? "text-[#F3EDE1]" : "text-[#6F685B]",
            )}
          >
            {calendarDay ?? index + 1}
          </span>
          {weekdayLabel && (
            <span
              className={cn(
                "mt-1 text-[8px] font-black uppercase tracking-[0.14em]",
                active ? "text-[#A89F88]" : "text-[#8A8270]",
              )}
            >
              {weekdayLabel}
            </span>
          )}
        </div>

        <div className="ml-1.5 min-w-0">
          <div className="relative flex min-w-0 items-center gap-2">
            <h3 className="shrink-0 text-[15px] font-black leading-tight">
              Day {index + 1}
            </h3>
            <DayWeatherPill
              date={weatherDate}
              points={weatherPoints}
              active={active}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(dayId);
              }}
              className={cn(
                "absolute right-0 grid size-6 shrink-0 place-items-center rounded-[7px] opacity-0 transition-all hover:text-destructive focus:opacity-100 group-hover:opacity-100",
                active
                  ? "text-[#948B76] hover:bg-white/10"
                  : "text-[#BB6A4F] hover:bg-[#FBE7DD]",
              )}
              title={`Delete Day ${index + 1}`}
              aria-label={`Delete Day ${index + 1}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          <p
            className={cn(
              "mt-1 truncate text-[11.5px] font-semibold lg:mt-1.5 lg:text-[12.5px]",
              active ? "text-[#C9C0AD]" : "text-[#746D60]",
            )}
            title={routeLabel}
          >
            {routeLabel}
          </p>

          <div
            className={cn(
              "mt-1.5 flex items-center gap-2.5 font-mono text-[10px] font-bold lg:mt-2 lg:text-[10.5px]",
              active ? "text-[#948B76]" : "text-[#9A917F]",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-1">
              <Route className="size-3 shrink-0 text-brand" />
              {distanceKm > 0 ? formatDistance(distanceKm) : "0 km"}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <Clock3
                className={cn(
                  "size-3 shrink-0",
                  active ? "text-[#70A98C]" : "text-[#2E7A57]",
                )}
              />
              {driveMin > 0 ? formatDuration(driveMin) : "—"}
            </span>
          </div>
        </div>
      </article>
    </>
  );
});

function MoveButton({
  direction,
  disabled,
  active,
  dayNumber,
  onClick,
}: {
  direction: "up" | "down";
  disabled: boolean;
  active: boolean;
  dayNumber: number;
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid size-4 place-items-center rounded-[5px] opacity-60 transition-all hover:opacity-100 disabled:cursor-default disabled:opacity-15",
        active
          ? "text-[#A89F88] hover:bg-white/10 hover:text-[#F3EDE1]"
          : "text-[#9F9685] hover:bg-[#EFE8D8] hover:text-foreground",
      )}
      title={`Move day ${direction}`}
      aria-label={`Move Day ${dayNumber} ${direction}`}
    >
      <Icon className="size-3" />
    </button>
  );
}
