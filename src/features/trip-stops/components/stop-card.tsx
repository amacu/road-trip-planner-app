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
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { StopPoint } from "@/features/trips/lib/trip-view-model";
import { EditableMarkdown } from "@/features/trip-days/components/route-notes-panel";
import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import { StopWeatherBox } from "@/features/trip-stops/components/stop-weather-box";
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
  plannedDate = null,
  dayStartTime = "",
  onSetDayStartTime,
  showSchedule = true,
  headerAction,
  onUpdate,
  onCopy,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSaveNotes,
  onSelect,
  isExpanded,
  onExpandedChange,
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
  plannedDate?: string | null;
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
  onSaveNotes?: (notes: string) => Promise<boolean>;
  /** Called when this stop is expanded (selected) — lets the map recenter on it and show its activities. */
  onSelect?: () => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const expanded = isExpanded ?? internalExpanded;

  function toggleExpanded() {
    const next = !expanded;
    if (isExpanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
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
  const hasDepartureRange = Boolean(
    arrivalTime && departureTime && arrivalTime !== departureTime,
  );
  const scheduleLabel = !showSchedule
    ? null
    : isTripStart
      ? null
      : !isActivity && arrivalTime
        ? hasDepartureRange && departureTime
          ? `${arrivalTime} – ${departureTime}`
          : `Arrives ${arrivalTime}`
        : isFirst
          ? arrivalTime
            ? `${arrivalTime}${departureTime ? ` – ${departureTime}` : ""}`
            : "Set start time"
          : isLast
            ? arrivalTime
              ? hasDepartureRange && departureTime
                ? `${arrivalTime} – ${departureTime}`
                : `Arrives ${arrivalTime}`
              : "Set start time"
            : arrivalTime
              ? `${arrivalTime}${departureTime ? ` – ${departureTime}` : ""}`
              : "Set start time";
  const scheduleIsSet = Boolean(arrivalTime);
  const locationIconClassName = cn(
    "grid size-10 shrink-0 place-items-center rounded-[10px] transition-colors",
    isTripStart
      ? "bg-[#D9ECDF] text-[#2E7A57] hover:bg-[#CBE4D3]"
      : isTripFinish
        ? "bg-[#F0DFC2] text-[#8A5524] hover:bg-[#E9D2AA]"
        : isActivity
          ? "bg-[#E7DFF3] text-[#7657B4] hover:bg-[#DCD0ED]"
          : "bg-[#F8E4DA] text-[#C44C28] hover:bg-[#F3D4C5]",
  );

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
          "relative z-[1] flex flex-col overflow-hidden rounded-[18px] border px-3.5 shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200",
          !expanded && stop.hasLocation ? "py-2" : "py-3",
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
                className={cn(
                  "grid size-4 place-items-center rounded-[5px] text-[#A89F88] opacity-65 transition-all hover:opacity-100 disabled:cursor-default disabled:opacity-15",
                  isActivity
                    ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                    : "hover:bg-muted hover:text-foreground",
                )}
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
                className={cn(
                  "grid size-4 place-items-center rounded-[5px] text-[#A89F88] opacity-65 transition-all hover:opacity-100 disabled:cursor-default disabled:opacity-15",
                  isActivity
                    ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                    : "hover:bg-muted hover:text-foreground",
                )}
                title="Move item down"
                aria-label={`Move ${stop.name} down`}
              >
                <ChevronDown className="size-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.();
              }}
              className="grid size-9 place-items-center rounded-[12px] font-mono text-[12px] font-black text-white transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              style={{ background: markerColor }}
              title={`Show ${stop.name}`}
              aria-label={`Show ${stop.name}`}
            >
              {isTripFinish ? (
                <CircleCheckBig className="size-4" />
              ) : isTripStart ? (
                <Flag className="size-4" />
              ) : (
                index + 1
              )}
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
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
              className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
            >
              {expanded ? (
                <EditableStopName
                  value={stop.name}
                  onChange={(name) => onUpdate({ name })}
                />
              ) : (
                <span
                  className="block cursor-text select-text truncate text-[15px] font-black leading-tight text-[#16130D]"
                  onClick={(event) => event.stopPropagation()}
                >
                  {stop.name}
                </span>
              )}
              {isTripStart || isTripFinish ? (
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 leading-none">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]",
                      isTripFinish
                        ? "bg-[#F0DFC2] text-[#80501F]"
                        : "bg-[#D9ECDF] text-[#256647]",
                    )}
                  >
                    {isTripFinish ? "Finish" : "Start"}
                  </span>
                  {isTripStart && onSetDayStartTime ? (
                    <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#71858B]">
                      <span>Departs</span>
                      <PlainTimeInput
                        value={dayStartTime ?? ""}
                        onChange={onSetDayStartTime}
                        compact
                        plain
                      />
                    </span>
                  ) : (
                    scheduleLabel && (
                      <span className="truncate text-[10px] font-bold text-[#7A7264]">
                        {scheduleLabel}
                      </span>
                    )
                  )}
                </span>
              ) : (
                (scheduleLabel || !stop.hasLocation) && (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-bold leading-none",
                      scheduleIsSet ? "text-[#6E756B]" : "text-[#A89F88]",
                    )}
                  >
                    {scheduleLabel &&
                      (scheduleIsSet ? (
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            isTripFinish
                              ? "bg-[#B57A36]"
                              : isActivity
                                ? "bg-[#7C5CBF]"
                                : "bg-brand",
                          )}
                        />
                      ) : (
                        <Clock className="size-3 shrink-0" />
                      ))}
                    {scheduleLabel}
                    {!stop.hasLocation && (
                      <span className="text-[#948B76]">
                        {scheduleLabel && "· "}No location
                      </span>
                    )}
                  </span>
                )
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              {headerAction}
              <button
                type="button"
                onClick={toggleExpanded}
                className={cn(
                  "grid size-7 place-items-center rounded-[8px] text-muted-foreground transition-colors",
                  isActivity
                    ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                    : "hover:bg-muted hover:text-foreground",
                )}
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
          <div className="mt-3">
            <div className="rounded-[13px] border border-[#DED3C0]/75 bg-white/20 p-2.5">
              <div className="flex items-start gap-2.5">
                {stop.hasLocation ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className={locationIconClassName}
                    title="Open in Google Maps"
                    aria-label={`Open ${stop.name} in Google Maps`}
                  >
                    <MapPin className="size-4" />
                  </a>
                ) : (
                  <span className={locationIconClassName}>
                    <MapPin className="size-4" />
                  </span>
                )}
                <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center">
                  {stop.hasLocation ? (
                    <>
                      <p className="truncate text-[11.5px] font-semibold leading-4 text-[#6F685B]">
                        {stop.address || stop.name}
                      </p>
                      <p className="font-mono text-[9.5px] font-medium leading-4 text-[#A09888]">
                        {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] font-semibold text-[#948B76]">
                      No location selected
                    </p>
                  )}
                </div>
                <div className="flex min-h-10 shrink-0 items-center gap-1">
                  {stop.hasLocation && isActivity && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdate({
                          address: "",
                          lat: 0,
                          lng: 0,
                          hasLocation: false,
                          countryCode: null,
                        });
                        setEditingLocation(false);
                      }}
                      className={cn(
                        "grid size-8 place-items-center rounded-[9px] text-[#817A6E] transition-colors",
                        isActivity
                          ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                          : "hover:bg-[#FBE7DD] hover:text-[#B8431F]",
                      )}
                      title="Remove location"
                      aria-label="Remove location"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingLocation((current) => !current)}
                    className={cn(
                      "grid size-8 place-items-center rounded-[9px] transition-colors",
                      isTripStart
                        ? "text-[#527762] hover:bg-[#D9ECDF] hover:text-[#256647]"
                        : isTripFinish
                          ? "text-[#866B4E] hover:bg-[#F0DFC2] hover:text-[#80501F]"
                          : isActivity
                            ? "text-[#765F9D] hover:bg-[#E7DFF3] hover:text-[#5F4295]"
                            : "text-[#8A7268] hover:bg-[#F8E4DA] hover:text-[#B8431F]",
                    )}
                    title={
                      stop.hasLocation ? "Change location" : "Add location"
                    }
                    aria-label={
                      stop.hasLocation ? "Change location" : "Add location"
                    }
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
              </div>
              {editingLocation && (
                <div className="mt-3">
                  <AddStopBox
                    embedded
                    onAdd={(result) => {
                      onUpdate({
                        address: result.address,
                        lat: result.lat,
                        lng: result.lng,
                        hasLocation: true,
                        countryCode: result.countryCode,
                      });
                      setEditingLocation(false);
                    }}
                    onClose={() => setEditingLocation(false)}
                    placeholder="Search a new location"
                    helpText=""
                  />
                </div>
              )}
            </div>

            {!isActivity && stop.hasLocation && plannedDate && (
              <StopWeatherBox
                lat={stop.lat}
                lng={stop.lng}
                date={plannedDate}
                time={arrivalTime || dayStartTime || "12:00"}
                endTime={departureTime}
              />
            )}

            {onSaveNotes && (
              <section
                className={cn(
                  "mt-3 rounded-[13px] border p-3",
                  isActivity
                    ? "border-[#D8CDE8] bg-white/35"
                    : "border-[#DED3C0]/80 bg-[#FFFCF6]/65",
                )}
              >
                <div className="mb-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#9B927F]">
                  Notes
                </div>
                <EditableMarkdown
                  value={stop.description ?? ""}
                  emptyLabel="Add useful details, links or reminders for this place."
                  onSave={onSaveNotes}
                  compact
                />
              </section>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <div className="flex rounded-[10px] border border-[#DED3C0]/80 bg-white/20 p-0.5 font-sans">
                {(
                  [
                    ["stop", "Stop", MapPin],
                    ["activity", "Activity", Landmark],
                  ] as const
                ).map(([type, label, Icon]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={
                      stop.itemType === type ||
                      (type === "stop" && !stop.hasLocation)
                    }
                    onClick={() => onUpdate({ itemType: type })}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[9.5px] font-bold transition-colors",
                      stop.itemType === type
                        ? type === "activity"
                          ? "bg-[#7C5CBF] text-white"
                          : "bg-brand text-brand-foreground"
                        : "text-[#7A7264] hover:text-foreground",
                      type === "stop" &&
                        !stop.hasLocation &&
                        "cursor-not-allowed opacity-35",
                    )}
                    aria-pressed={stop.itemType === type}
                    title={
                      type === "stop" && !stop.hasLocation
                        ? "Add a location before changing this activity to a stop"
                        : undefined
                    }
                  >
                    <Icon className="size-3" />
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex h-8 items-center gap-2 rounded-[10px] border border-[#DED3C0]/80 bg-white/20 px-2.5">
                <span className="font-sans text-[9px] font-black uppercase tracking-[0.08em] text-[#A09888]">
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
              </label>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {onCopy && (
                  <button
                    type="button"
                    onClick={onCopy}
                    className={cn(
                      "grid size-7 place-items-center rounded-[8px] text-[#7A7264] transition-colors",
                      isActivity
                        ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                        : "hover:bg-[#FBE7DD] hover:text-brand",
                    )}
                    title={`Copy ${stop.name}`}
                    aria-label={`Copy ${stop.name}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRemove}
                  className={cn(
                    "grid size-7 place-items-center rounded-[8px] text-[#817A6E] transition-colors",
                    isActivity
                      ? "hover:bg-[#E7DFF3] hover:text-[#6C4FA8]"
                      : "hover:bg-[#FBE7DD] hover:text-destructive",
                  )}
                  title={`Delete ${stop.name}`}
                  aria-label={`Delete ${stop.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function EditableStopName({
  value,
  onChange,
  ariaLabel = "Stop name",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const committedRef = useRef(value);

  useEffect(() => {
    setDraft(value);
    committedRef.current = value;
  }, [value]);

  function commit() {
    const next = draft.trim();
    if (!next) {
      setDraft(committedRef.current);
      return;
    }
    if (next !== committedRef.current) {
      committedRef.current = next;
      setDraft(next);
      onChange(next);
    }
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(committedRef.current);
          event.currentTarget.blur();
        }
      }}
      className="block w-full min-w-0 truncate border-0 bg-transparent p-0 text-[15px] font-black leading-tight text-[#16130D] outline-none placeholder:text-[#A89F88] focus:ring-0"
      aria-label={ariaLabel}
    />
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
