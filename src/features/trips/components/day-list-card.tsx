"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDistance, formatDuration } from "@/lib/geo";

export function DayListCard({
  id,
  dateLabel,
  index,
  distanceKm,
  driveMin,
  firstStopName,
  lastStopName,
  active,
  onSelect,
}: {
  id: string;
  dateLabel: string | null;
  index: number;
  distanceKm: number;
  driveMin: number;
  firstStopName?: string;
  lastStopName?: string;
  active: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const routeLabel =
    !firstStopName && !lastStopName
      ? "No stops yet"
      : firstStopName === lastStopName
        ? `${firstStopName} (loop)`
        : `${firstStopName ?? "—"} → ${lastStopName ?? "—"}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-[18px] border bg-card p-4 shadow-sm transition-all",
        active
          ? "border-[#16130D] bg-[#16130D] text-[#F3EDE1]"
          : "border-border hover:border-brand/45 hover:bg-[#fffaf0]",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "mt-0.5 grid size-6 shrink-0 cursor-grab place-items-center rounded-md active:cursor-grabbing",
          active
            ? "text-[#948b76] hover:bg-white/10"
            : "text-muted-foreground hover:bg-muted",
        )}
        title="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black">
            Day {index + 1}
            {dateLabel ? (
              <span
                className={cn(
                  "font-semibold",
                  active ? "text-[#c9c0ad]" : "text-muted-foreground",
                )}
              >
                {" "}
                · {dateLabel}
              </span>
            ) : null}
          </span>
        </div>
        <p
          className={cn(
            "mt-1.5 truncate text-xs",
            active ? "text-[#c9c0ad]" : "text-muted-foreground",
          )}
        >
          {routeLabel}
        </p>
        <p
          className={cn(
            "mt-2 font-mono text-xs font-semibold",
            active ? "text-[#948b76]" : "text-foreground/70",
          )}
        >
          {distanceKm > 0 ? formatDistance(distanceKm) : "0 km"} ·{" "}
          {distanceKm > 0 ? formatDuration(driveMin) : "—"}
        </p>
      </div>
    </div>
  );
}
