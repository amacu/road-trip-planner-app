"use client";

import {
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  Clock,
  Copy,
  Flag,
  Landmark,
  MapPin,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { StopPoint } from "@/features/trips/lib/trip-view-model";
import { cn } from "@/lib/utils";

function minutesToHHMM(min: number | null | undefined): string {
  if (!min) return "00:00";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(value: string): number | null {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

export function StopCard({
  index,
  stop,
  hiddenWalkingExcursionCount = 0,
  onExpandWalkingExcursions,
  isWalkingExcursion = false,
  showDriveSpine = false,
  isFirst = false,
  isLast = false,
  isTripStart = false,
  isTripFinish = false,
  arrivalTime = null,
  departureTime = null,
  dayStartTime = "",
  onSetDayStartTime,
  showSchedule = true,
  headerAction,
  onUpdate,
  onCopy,
  onRemove,
  onMoveUp,
  onMoveDown,
  onOpenNotes,
  onSelect,
}: {
  index: number;
  stop: StopPoint;
  hiddenWalkingExcursionCount?: number;
  onExpandWalkingExcursions?: () => void;
  isWalkingExcursion?: boolean;
  showDriveSpine?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  /** Marks the first stop of day one as the trip's point of departure. */
  isTripStart?: boolean;
  /** Marks the final stop of the final day as the trip's destination. */
  isTripFinish?: boolean;
  arrivalTime?: string | null;
  departureTime?: string | null;
  dayStartTime?: string;
  onSetDayStartTime?: (startTime: string) => void;
  /** Hides the arrival/departure time badge when the schedule is unavailable. */
  showSchedule?: boolean;
  /** Extra control rendered next to the expand/remove buttons, e.g. "Move to day". */
  headerAction?: React.ReactNode;
  onUpdate: (patch: Partial<StopPoint>) => void;
  onCopy?: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenNotes?: () => void;
  /** Called when this stop is expanded (selected) — lets the map recenter on it and show its activities. */
  onSelect?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    setExpanded((current) => !current);
  }

  const isActivity = stop.itemType === "activity";
  const markerColor = isTripFinish
    ? "#8A5524"
    : isTripStart
      ? "#2E7A57"
      : isActivity
        ? "#7C5CBF"
        : isFirst
          ? "#16130D"
          : "#E4562A";
  const hasVisitDuration = (stop.visitDurationMin ?? 0) > 0;
  const scheduleLabel = !showSchedule
    ? null
    : isTripStart
      ? null
      : !isActivity && arrivalTime
        ? hasVisitDuration && departureTime
          ? `${arrivalTime} – ${departureTime}`
          : `Arrives ${arrivalTime}`
        : isFirst
          ? arrivalTime
            ? `${arrivalTime}${departureTime ? ` – ${departureTime}` : ""}`
            : "Set start time"
          : isLast
            ? arrivalTime
              ? `Arrives ${arrivalTime}`
              : "Set start time"
            : arrivalTime
              ? `${arrivalTime}${departureTime ? ` – ${departureTime}` : ""}`
              : "Set start time";
  const scheduleIsSet = Boolean(arrivalTime);

  return (
    <li
      className={cn(
        "group relative transition-[margin] duration-200",
        isWalkingExcursion && "ml-8 sm:ml-16",
        hiddenWalkingExcursionCount > 0 && "mb-3",
        showDriveSpine &&
          "before:absolute before:bottom-0 before:left-[-14px] before:top-0 before:border-l before:border-dashed before:border-[#D1C7B2] sm:before:left-[-46px]",
      )}
    >
      {hiddenWalkingExcursionCount > 0 && (
        <button
          type="button"
          onClick={onExpandWalkingExcursions}
          className="absolute -bottom-3 left-8 right-0 h-6 rounded-b-[16px] border border-t-0 border-[#CFC1E5] bg-[#EAE4F3] shadow-[0_7px_15px_rgba(124,92,191,0.09)] transition-colors hover:border-[#B9A6D8] hover:bg-[#E3DAF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B82C8] sm:left-16"
          title={`Show ${hiddenWalkingExcursionCount} walking ${
            hiddenWalkingExcursionCount === 1 ? "excursion" : "excursions"
          }`}
          aria-label={`Show ${hiddenWalkingExcursionCount} walking ${
            hiddenWalkingExcursionCount === 1 ? "excursion" : "excursions"
          }`}
        />
      )}
      <div
        className={cn(
          "relative z-[1] flex flex-col overflow-hidden rounded-[18px] border px-3.5 py-3 shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200",
          isTripFinish
            ? expanded
              ? "border-[#C99A5B] bg-[#F7EEDC] shadow-[0_10px_24px_rgba(138,85,36,0.12)]"
              : "border-[#DFC49A] bg-[#FBF4E7] hover:border-[#C99A5B] hover:bg-[#F7EEDC] hover:shadow-[0_10px_24px_rgba(138,85,36,0.1)]"
            : isTripStart
              ? expanded
                ? "border-[#79A78F] bg-[#E7F1EA] shadow-[0_10px_24px_rgba(46,122,87,0.12)]"
                : "border-[#A9C9B7] bg-[#EDF5EF] hover:border-[#79A78F] hover:bg-[#E7F1EA] hover:shadow-[0_10px_24px_rgba(46,122,87,0.1)]"
              : isActivity
                ? expanded
                  ? "border-[#A88DDA] bg-[#F0ECF6] shadow-[0_10px_24px_rgba(124,92,191,0.12)]"
                  : "border-[#D8CDE8] bg-[#F3EFF8] hover:border-[#BCA9DF] hover:bg-[#F0ECF6] hover:shadow-[0_9px_22px_rgba(124,92,191,0.1)]"
                : expanded
                  ? "border-brand/50 bg-[#F8F1E6] shadow-[0_10px_24px_rgba(228,86,42,0.1)]"
                  : "border-[#DED3C0] bg-[#F8F4EC] hover:border-[#CDBFA6] hover:bg-[#FAF6EE] hover:shadow-[0_9px_22px_rgba(22,19,13,0.08)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 left-0 w-[3px] rounded-r-full",
            isTripFinish
              ? "bg-[#B57A36]"
              : isTripStart
                ? "bg-[#2E7A57]"
                : isActivity
                  ? "bg-[#7C5CBF]"
                  : "bg-brand",
          )}
        />

        <div className="flex items-center gap-2.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex flex-col gap-px">
              <button
                type="button"
                disabled={isFirst}
                onClick={onMoveUp}
                className="grid size-4 place-items-center rounded-[5px] text-[#A89F88] opacity-65 transition-all hover:bg-muted hover:text-foreground hover:opacity-100 disabled:cursor-default disabled:opacity-15"
                title="Move item up"
                aria-label={`Move ${stop.name} up`}
              >
                <ChevronUp className="size-3" />
              </button>
              <span
                className={cn(
                  "mx-auto size-1.5 rounded-full",
                  isTripFinish
                    ? "bg-[#B57A36]"
                    : isTripStart
                      ? "bg-[#2E7A57]"
                      : isActivity
                        ? "bg-[#7C5CBF]"
                        : "bg-brand",
                )}
              />
              <button
                type="button"
                disabled={isLast}
                onClick={onMoveDown}
                className="grid size-4 place-items-center rounded-[5px] text-[#A89F88] opacity-65 transition-all hover:bg-muted hover:text-foreground hover:opacity-100 disabled:cursor-default disabled:opacity-15"
                title="Move item down"
                aria-label={`Move ${stop.name} down`}
              >
                <ChevronDown className="size-3" />
              </button>
            </div>
            <div
              className="grid size-8 place-items-center rounded-full font-mono text-[12px] font-black text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
              style={{ background: markerColor }}
            >
              {isTripFinish ? (
                <CircleCheckBig className="size-4" />
              ) : isTripStart ? (
                <Flag className="size-4" />
              ) : (
                index + 1
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={onSelect}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.();
                }
              }}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]",
                    isTripFinish
                      ? "bg-[#F0DFC2] text-[#80501F]"
                      : isTripStart
                        ? "bg-[#D9ECDF] text-[#256647]"
                        : isActivity
                          ? "bg-[#F0EAFB] text-[#6C4FA8]"
                          : "bg-[#FBE7DD] text-[#B8431F]",
                  )}
                >
                  {isTripFinish
                    ? "Finish"
                    : isTripStart
                      ? "Start"
                      : isActivity
                        ? "Activity"
                        : "Stop"}
                </span>
                {scheduleLabel && (
                  <span
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-bold",
                      scheduleIsSet ? "text-[#6E756B]" : "text-[#A89F88]",
                    )}
                  >
                    {scheduleIsSet ? (
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          isActivity ? "bg-[#7C5CBF]" : "bg-brand",
                        )}
                      />
                    ) : (
                      <Clock className="size-3 shrink-0" />
                    )}
                    {scheduleLabel}
                  </span>
                )}
                {isTripStart && onSetDayStartTime && (
                  <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#71858B]">
                    <span>Departs</span>
                    <PlainTimeInput
                      value={dayStartTime ?? ""}
                      onChange={onSetDayStartTime}
                      compact
                      plain
                    />
                  </span>
                )}
              </span>
              <span
                className="mt-1.5 block cursor-text select-text truncate text-[15px] font-black leading-tight text-[#16130D]"
                onClick={(event) => event.stopPropagation()}
              >
                {stop.name}
              </span>
              <span className="mt-1 block truncate text-[11.5px] font-medium text-[#948B76]">
                {stop.address || "No address"}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              {headerAction}
              {onOpenNotes && (
                <button
                  type="button"
                  onClick={onOpenNotes}
                  className="grid size-7 place-items-center rounded-[8px] text-[#7A7264] opacity-100 transition-all hover:bg-[#EEE7DA] hover:text-brand focus:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  title={`Open notes for ${stop.name}`}
                  aria-label={`Open notes for ${stop.name}`}
                >
                  <NotebookPen className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleExpanded}
                className="grid size-7 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={expanded ? "Collapse item" : "Expand item"}
                aria-label={expanded ? "Collapse item" : "Expand item"}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D8CEB8]/70 pt-3 font-mono text-[11px] font-semibold text-[#5F594D]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="flex rounded-[8px] bg-[#EEE7DA] p-0.5 font-sans">
                {(
                  [
                    ["stop", "Stop", MapPin],
                    ["activity", "Activity", Landmark],
                  ] as const
                ).map(([type, label, Icon]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={stop.itemType === type}
                    onClick={() => onUpdate({ itemType: type })}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[9.5px] font-bold transition-colors",
                      stop.itemType === type
                        ? type === "activity"
                          ? "bg-[#7C5CBF] text-white shadow-sm"
                          : "bg-brand text-brand-foreground shadow-sm"
                        : "text-[#7A7264] hover:text-foreground",
                    )}
                    aria-pressed={stop.itemType === type}
                  >
                    <Icon className="size-3" />
                    {label}
                  </button>
                ))}
              </div>
              <span
                className="hidden h-4 w-px bg-[#D8CEB8] sm:block"
                aria-hidden
              />
              <span className="flex items-center gap-1.5">
                <span className="font-sans font-normal text-[#a89f88]">
                  Visit
                </span>
                <PlainTimeInput
                  value={minutesToHHMM(stop.visitDurationMin)}
                  onChange={(value) =>
                    onUpdate({ visitDurationMin: hhmmToMinutes(value) })
                  }
                  compact
                  plain
                />
              </span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {onCopy && (
                <button
                  type="button"
                  onClick={onCopy}
                  className="grid size-7 place-items-center rounded-[8px] text-[#7A7264] transition-colors hover:bg-[#FBE7DD] hover:text-brand"
                  title={`Copy ${stop.name}`}
                  aria-label={`Copy ${stop.name}`}
                >
                  <Copy className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                className="grid size-7 place-items-center rounded-[8px] text-[#A85A43] transition-colors hover:bg-[#FBE7DD] hover:text-destructive"
                title={`Delete ${stop.name}`}
                aria-label={`Delete ${stop.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function PlainTimeInput({
  value,
  onChange,
  compact = false,
  plain = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Tighter padding/no icon — for use inside narrow grid cells (e.g. the activity row's time column). */
  compact?: boolean;
  /** No background/padding of its own — for use inside a cell that already has its own background (e.g. the Arrives/Duration/Departs grid), so it reads as plain text rather than a distinct input. */
  plain?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const committedRef = useRef(value);

  useEffect(() => {
    setDraft(value);
    committedRef.current = value;
  }, [value]);

  function commit() {
    if (draft !== committedRef.current) {
      committedRef.current = draft;
      onChange(draft);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl transition-colors",
        plain
          ? "focus-within:ring-1 focus-within:ring-brand/40"
          : "bg-[#F3EFE4] focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/40",
        plain ? "px-0 py-0" : compact ? "px-1.5 py-1" : "px-3 py-2",
      )}
    >
      {!compact && !plain && (
        <Clock className="size-3.5 shrink-0 text-[#a89f88]" />
      )}
      <input
        type="time"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "w-full min-w-0 bg-transparent font-mono font-semibold text-[#16130D] outline-none",
          compact ? "text-xs" : "text-sm",
        )}
      />
    </div>
  );
}
