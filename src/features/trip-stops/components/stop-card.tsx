"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera,
  ChevronDown,
  Clock,
  Coffee,
  GripVertical,
  Landmark,
  MapPin,
  Mountain,
  Plus,
  ShoppingBag,
  Trees,
  Trash2,
  Utensils,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  StopPoint,
  TripActivityPlain,
} from "@/features/trips/lib/trip-view-model";
import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import { cn } from "@/lib/utils";
import { ACTIVITY_CATEGORIES } from "@/lib/validators/trip-activity";

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
  isFirst = false,
  isLast = false,
  arrivalTime = null,
  departureTime = null,
  dayStartTime,
  onSetDayStartTime,
  showSchedule = true,
  headerAction,
  onUpdate,
  onRemove,
  onAddActivity: _onAddActivity,
  onUpdateActivity: _onUpdateActivity,
  onRemoveActivity: _onRemoveActivity,
  onReorderActivities: _onReorderActivities,
  onSelect,
}: {
  index: number;
  stop: StopPoint;
  isFirst?: boolean;
  isLast?: boolean;
  arrivalTime?: string | null;
  departureTime?: string | null;
  dayStartTime?: string;
  onSetDayStartTime?: (startTime: string) => void;
  /** Hides the arrival/departure time badge — for contexts with no day schedule (e.g. the unassigned-stops bucket). */
  showSchedule?: boolean;
  /** Extra control rendered next to the expand/remove buttons, e.g. "Move to day". */
  headerAction?: React.ReactNode;
  onUpdate: (patch: Partial<StopPoint>) => void;
  onRemove: () => void;
  onAddActivity: (place: GeocodeResult) => void;
  onUpdateActivity: (
    activityId: string,
    patch: Partial<TripActivityPlain>,
  ) => void;
  onRemoveActivity: (activityId: string) => void;
  onReorderActivities: (orderedActivityIds: string[]) => void;
  /** Called when this stop is expanded (selected) — lets the map recenter on it and show its activities. */
  onSelect?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stop.id,
  });
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) onSelect?.();
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const isActivity = stop.itemType === "activity";
  const markerColor = isActivity ? "#7C5CBF" : isFirst ? "#16130D" : "#E4562A";

  return (
    <li ref={setNodeRef} style={style} className="group relative">
      <div
        className={cn(
          "flex flex-col rounded-[15px] border p-[14px]",
          isActivity
            ? "border-violet-200 bg-violet-50/70"
            : "border-[#EFE8D8] bg-white",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="grid size-9 shrink-0 cursor-grab place-items-center rounded-[10px] font-mono text-sm font-bold text-white active:cursor-grabbing"
            style={{ background: markerColor }}
          >
            {isActivity ? <Camera className="size-4" /> : index + 1}
          </div>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <button
              onClick={toggleExpanded}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15.5px] font-bold leading-tight text-[#16130D]">
                  {stop.name}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-[#948b76]">
                {stop.address || "No address"}
              </span>
              {showSchedule && (
                <span className="mt-[9px] inline-flex items-center gap-[5px] rounded-full border border-[#EFE8D8] bg-[#F3EFE4] px-[9px] py-[3px] text-[11px] font-semibold text-[#7a7264]">
                  {isFirst ? (
                    departureTime ? (
                      <>
                        <span className="size-[5px] rounded-full bg-[#E4562A]" />
                        Departs {departureTime}
                      </>
                    ) : (
                      <>
                        <Clock className="size-3" />
                        Set the day&apos;s start time
                      </>
                    )
                  ) : isLast ? (
                    arrivalTime ? (
                      <>
                        <span className="size-[5px] rounded-full bg-[#E4562A]" />
                        Arrives {arrivalTime}
                      </>
                    ) : (
                      <>
                        <Clock className="size-3" />
                        Set the day&apos;s start time
                      </>
                    )
                  ) : arrivalTime ? (
                    <>
                      <span className="size-[5px] rounded-full bg-[#E4562A]" />
                      {arrivalTime}
                      {departureTime ? ` – ${departureTime}` : ""}
                    </>
                  ) : (
                    <>
                      <Clock className="size-3" />
                      Set the day&apos;s start time
                    </>
                  )}
                </span>
              )}
            </button>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {headerAction}
              <button
                onClick={toggleExpanded}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              <button
                onClick={onRemove}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border pt-3 font-mono text-xs font-semibold text-[#16130D]">
            {isFirst && onSetDayStartTime ? (
              <span className="flex items-center gap-1.5">
                <span className="font-sans font-normal text-[#a89f88]">
                  Starts
                </span>
                <PlainTimeInput
                  value={dayStartTime ?? ""}
                  onChange={onSetDayStartTime}
                  compact
                  plain
                />
              </span>
            ) : (
              arrivalTime && (
                <span>
                  <span className="font-sans font-normal text-[#a89f88]">
                    Arrives
                  </span>{" "}
                  {arrivalTime}
                </span>
              )
            )}
            {!isFirst && (
              <>
                <span className="text-[#cbc1a9]">·</span>
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
              </>
            )}
            {departureTime && (
              <>
                <span className="text-[#cbc1a9]">·</span>
                <span>
                  <span className="font-sans font-normal text-[#a89f88]">
                    Departs
                  </span>{" "}
                  {departureTime}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function ActivitiesTabDeprecated({
  activities,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
}: {
  activities: TripActivityPlain[];
  onAdd: (place: GeocodeResult) => void;
  onUpdate: (activityId: string, patch: Partial<TripActivityPlain>) => void;
  onRemove: (activityId: string) => void;
  onReorder: (orderedActivityIds: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);

  function moveActivity(activityId: string, direction: -1 | 1) {
    const index = activities.findIndex(
      (activity) => activity.id === activityId,
    );
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= activities.length) return;

    const next = [...activities];
    const [activity] = next.splice(index, 1);
    next.splice(nextIndex, 0, activity);
    onReorder(next.map((item) => item.id));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-black tracking-tight">Activities</h4>
        <button
          onClick={() => setAdding((value) => !value)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-muted px-2.5 text-xs font-bold text-brand hover:bg-brand-muted/80"
        >
          <Plus className="size-3.5" />
          Add Activity
        </button>
      </div>

      {adding && (
        <AddStopBox
          placeholder="Search an activity place"
          helpText="Pick a real place for this activity."
          onAdd={(place) => {
            onAdd(place);
            setAdding(false);
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {activities.length === 0 && !adding ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No activities yet. Add a place to visit here.
        </div>
      ) : (
        <ol className="space-y-2">
          {activities.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isFirst={index === 0}
              isLast={index === activities.length - 1}
              onMoveUp={() => moveActivity(activity.id, -1)}
              onMoveDown={() => moveActivity(activity.id, 1)}
              onUpdate={(patch) => onUpdate(activity.id, patch)}
              onRemove={() => onRemove(activity.id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityRow({
  activity,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onRemove,
}: {
  activity: TripActivityPlain;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (patch: Partial<TripActivityPlain>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { icon, tone, label } = getActivityPresentation(activity.category);
  const Icon = icon;

  return (
    <li className="rounded-lg border border-border bg-white p-2">
      <div className="grid grid-cols-[24px_40px_minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex flex-col items-center">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="grid size-4 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
            title="Move up"
          >
            <ChevronDown className="size-3 rotate-180" />
          </button>
          <GripVertical className="size-4 text-muted-foreground" />
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="grid size-4 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
            title="Move down"
          >
            <ChevronDown className="size-3" />
          </button>
        </div>

        <div className={cn("grid size-10 place-items-center rounded-lg", tone)}>
          <Icon className="size-5" />
        </div>

        <button
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            {activity.startTime && (
              <span className="shrink-0 text-xs font-bold text-muted-foreground">
                {activity.startTime}
              </span>
            )}
            <span className="truncate text-sm font-bold">{activity.title}</span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="truncate">
              {activity.address || "No address saved"}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((value) => !value)}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            title={expanded ? "Collapse activity" : "Expand activity"}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          <button
            onClick={onRemove}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
            title="Delete activity"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-2">
            <PlainTimeInput
              value={activity.startTime ?? ""}
              onChange={(v) => onUpdate({ startTime: v })}
              compact
            />
            <input
              value={activity.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="h-8 min-w-0 rounded-md border border-input bg-white px-2 text-sm font-bold outline-none ring-brand/40 focus:ring-2"
            />
          </div>
          <textarea
            value={activity.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            placeholder="What will you do here?"
            className="w-full resize-none rounded-md border border-input bg-white px-2 py-1.5 text-xs outline-none ring-brand/40 focus:ring-2"
          />
          <Select
            value={activity.category}
            onValueChange={(category) => onUpdate({ category })}
          >
            <SelectTrigger className="h-8 rounded-md border-input bg-white px-2 text-xs font-semibold">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_CATEGORIES.map((category) => {
                const { icon: Icon, label } = getActivityPresentation(category);
                return (
                  <SelectItem key={category} value={category}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </li>
  );
}

const ACTIVITY_PRESENTATION = {
  sightseeing: {
    icon: Camera,
    tone: "bg-violet-50 text-violet-600",
    label: "Sightseeing",
  },
  food: {
    icon: Utensils,
    tone: "bg-orange-50 text-orange-600",
    label: "Food",
  },
  culture: {
    icon: Landmark,
    tone: "bg-emerald-50 text-emerald-600",
    label: "Culture",
  },
  nature: {
    icon: Trees,
    tone: "bg-lime-50 text-lime-700",
    label: "Nature",
  },
  hiking: {
    icon: Mountain,
    tone: "bg-teal-50 text-teal-600",
    label: "Hiking",
  },
  shopping: {
    icon: ShoppingBag,
    tone: "bg-pink-50 text-pink-600",
    label: "Shopping",
  },
  coffee: {
    icon: Coffee,
    tone: "bg-sky-50 text-sky-600",
    label: "Coffee",
  },
  other: {
    icon: Camera,
    tone: "bg-violet-50 text-violet-600",
    label: "Other",
  },
} satisfies Record<
  string,
  { icon: typeof Camera; tone: string; label: string }
>;

function getActivityPresentation(category: string) {
  return (
    ACTIVITY_PRESENTATION[category as keyof typeof ACTIVITY_PRESENTATION] ??
    ACTIVITY_PRESENTATION.other
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
