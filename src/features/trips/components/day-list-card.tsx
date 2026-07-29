"use client";

import { ChevronDown, ChevronUp, Clock3, Route, Trash2 } from "lucide-react";

import { formatDistance, formatDuration } from "@/lib/geo";
import { cn } from "@/lib/utils";

export function DayListCard({
  dateLabel,
  index,
  isLast,
  distanceKm,
  driveMin,
  firstStopName,
  lastStopName,
  active,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  dateLabel: string | null;
  index: number;
  isLast: boolean;
  distanceKm: number;
  driveMin: number;
  firstStopName?: string;
  lastStopName?: string;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const routeLabel =
    !firstStopName && !lastStopName
      ? "Add stops to plan this day"
      : firstStopName === lastStopName
        ? `${firstStopName} · Loop route`
        : `${firstStopName ?? "Starting point"} → ${lastStopName ?? "Destination"}`;
  const dateParts = dateLabel?.split(" ") ?? [];
  const calendarDay = dateParts.find((part) => /^\d/.test(part));
  const calendarMonth = dateParts.find((part) => !/^\d/.test(part));

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      className={cn(
        "group relative grid cursor-pointer grid-cols-[16px_45px_minmax(0,1fr)] items-center gap-2.5 rounded-[20px] border px-3 py-3.5 shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200",
        active
          ? "border-[#16130D] bg-[#16130D] text-[#F3EDE1] shadow-[0_12px_28px_rgba(22,19,13,0.18)]"
          : "border-[#DED3C0] bg-[#FAF6EE] hover:-translate-y-0.5 hover:border-[#CDBFA6] hover:bg-[#FCF8F1] hover:shadow-[0_10px_24px_rgba(22,19,13,0.09)]",
      )}
    >
      <div className="flex flex-col items-center gap-px">
        <MoveButton
          direction="up"
          disabled={index === 0}
          active={active}
          dayNumber={index + 1}
          onClick={onMoveUp}
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
          onClick={onMoveDown}
        />
      </div>

      <div
        className={cn(
          "flex h-12 min-w-0 flex-col items-center justify-center border-r pr-2.5",
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
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="shrink-0 text-[15px] font-black leading-tight">
            Day {index + 1}
          </h3>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className={cn(
              "ml-auto grid size-6 shrink-0 place-items-center rounded-[7px] opacity-100 transition-all hover:text-destructive focus:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
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
            "mt-1.5 truncate text-[12.5px] font-semibold",
            active ? "text-[#C9C0AD]" : "text-[#746D60]",
          )}
          title={routeLabel}
        >
          {routeLabel}
        </p>

        <div
          className={cn(
            "mt-2 flex items-center gap-2.5 font-mono text-[10.5px] font-bold",
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
  );
}

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
