"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Clock,
  Footprints,
  Fuel,
  Navigation,
  Plus,
  Route,
  Trash2,
} from "lucide-react";
import { Fragment, useState } from "react";

import type {
  StopPoint,
  TripActivityPlain,
  TripDayPlain,
} from "@/features/trips/lib/trip-view-model";
import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import { StopCard } from "@/features/trip-stops/components/stop-card";
import {
  PreviousStayBanner,
  StayCard,
} from "@/features/trip-stays/components/stay-card";
import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";
import {
  addMinutesToTime,
  computeStopSchedule,
  formatDistance,
  formatDuration,
} from "@/lib/geo";
import type { GeocodeResult } from "@/lib/integrations/geocode";

export function DayPanel({
  day,
  index,
  dateLabel,
  stops,
  distanceKm,
  driveMin,
  fuelPln,
  legs,
  startLeg,
  endLeg,
  onRemoveDay,
  onAddStop,
  onUpdateStop,
  onRemoveStop,
  onReorderStops,
  onAddActivity,
  onUpdateActivity,
  onRemoveActivity,
  onReorderActivities,
  onSetDayStartTime,
  onLaunchNav,
  onSelectStop,
  stay,
  previousStay,
  showStay = true,
  onSaveStay,
  onDeleteStay,
}: {
  day: TripDayPlain;
  index: number;
  dateLabel: string | null;
  stops: StopPoint[];
  distanceKm: number;
  driveMin: number;
  fuelPln: number;
  legs: Array<{ distanceKm: number; durationMin: number }>;
  startLeg?: { distanceKm: number; durationMin: number };
  endLeg?: { distanceKm: number; durationMin: number };
  onRemoveDay: () => void;
  onAddStop: (result: GeocodeResult, itemType: "stop" | "activity") => void;
  onUpdateStop: (stopId: string, patch: Partial<StopPoint>) => void;
  onRemoveStop: (stopId: string) => void;
  onReorderStops: (orderedStopIds: string[]) => void;
  onAddActivity: (stopId: string, place: GeocodeResult) => void;
  onUpdateActivity: (
    activityId: string,
    patch: Partial<TripActivityPlain>,
  ) => void;
  onRemoveActivity: (activityId: string) => void;
  onReorderActivities: (stopId: string, orderedActivityIds: string[]) => void;
  onSetDayStartTime: (startTime: string) => void;
  onLaunchNav: () => void;
  /** Called with a stop's id when it's expanded/selected — lets the map recenter on it and show its activities. */
  onSelectStop?: (stopId: string) => void;
  stay?: TripStayPlain;
  previousStay?: TripStayPlain;
  showStay?: boolean;
  onSaveStay: Parameters<typeof StayCard>[0]["onSave"];
  onDeleteStay: () => Promise<void>;
}) {
  const [addingType, setAddingType] = useState<"stop" | "activity" | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const schedule = computeStopSchedule(day.startTime, stops, legs);
  const lastDepartureTime = schedule[schedule.length - 1]?.departureTime;
  const stayArrivalTime =
    lastDepartureTime && endLeg
      ? addMinutesToTime(lastDepartureTime, endLeg.durationMin)
      : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = stops.findIndex((s) => s.id === active.id);
    const to = stops.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;

    onReorderStops(arrayMove(stops, from, to).map((s) => s.id));
  }

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fffaf0]">
      <div className="bg-[#FBF8F1] px-5 pb-5 pt-6">
        <div className="mb-0.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate font-['Bricolage_Grotesque'] text-[30px] font-extrabold leading-none tracking-[-0.03em]">
              Day {index + 1}
            </h1>
            {dateLabel && (
              <p className="mt-1 text-[12px] font-semibold text-[#a89f88]">
                {dateLabel}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onLaunchNav}
              disabled={stops.length < 2}
              className="grid size-[34px] place-items-center rounded-[10px] border-0 bg-[#16130D] text-white hover:bg-[#2a251b] disabled:cursor-not-allowed disabled:opacity-40"
              title="Start navigation in Google Maps"
            >
              <Navigation className="size-4" />
            </button>
            <button
              onClick={onRemoveDay}
              className="grid size-[34px] place-items-center rounded-[10px] border border-[#E7DFCE] bg-[#F3EFE4] text-[#bb6a4f] hover:bg-[#FBE7DD] hover:text-destructive"
              title="Delete day"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <p className="mb-5 mt-1.5 truncate text-sm font-medium text-[#7a7264]">
          {firstStop?.name ?? "—"} → {lastStop?.name ?? "—"}
        </p>

        <div className="flex gap-2">
          <HeaderStat
            value={distanceKm > 0 ? formatDistance(distanceKm) : "—"}
            tone="distance"
          />
          <HeaderStat
            value={driveMin > 0 ? formatDuration(driveMin) : "—"}
            tone="drive"
          />
          <HeaderStat
            value={fuelPln > 0 ? `${fuelPln} PLN` : "—"}
            tone="fuel"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <div className="flex min-h-full flex-col">
          {previousStay && (
            <PreviousStayBanner
              stay={previousStay}
              departureTime={day.startTime}
              onSetDepartureTime={onSetDayStartTime}
            />
          )}
          {startLeg && (
            <ol>
              <RouteLegSummary
                leg={startLeg}
                mode={stops[0]?.travelMode}
                onModeChange={(travelMode) =>
                  stops[0] && onUpdateStop(stops[0].id, { travelMode })
                }
              />
            </ol>
          )}
          <DndContext
            id={`trip-stops-dnd-${day.id}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stops.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-2">
                {stops.length === 0 && !addingType && (
                  <li className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No stops yet. Add a stop to start planning this day.
                  </li>
                )}
                {stops.map((stop, i) => (
                  <Fragment key={stop.id}>
                    <StopCard
                      index={
                        stops
                          .slice(0, i + 1)
                          .filter((item) => item.itemType === "stop").length - 1
                      }
                      stop={stop}
                      isFirst={i === 0}
                      isLast={i === stops.length - 1}
                      arrivalTime={schedule[i]?.arrivalTime ?? null}
                      departureTime={schedule[i]?.departureTime ?? null}
                      dayStartTime={day.startTime ?? ""}
                      onSetDayStartTime={onSetDayStartTime}
                      onUpdate={(patch) => onUpdateStop(stop.id, patch)}
                      onRemove={() => onRemoveStop(stop.id)}
                      onAddActivity={(place) => onAddActivity(stop.id, place)}
                      onUpdateActivity={onUpdateActivity}
                      onRemoveActivity={onRemoveActivity}
                      onReorderActivities={(activityIds) =>
                        onReorderActivities(stop.id, activityIds)
                      }
                      onSelect={() => onSelectStop?.(stop.id)}
                    />
                    {i < stops.length - 1 && (
                      <RouteLegSummary
                        leg={legs[i]}
                        mode={stops[i + 1].travelMode}
                        onModeChange={(travelMode) =>
                          onUpdateStop(stops[i + 1].id, { travelMode })
                        }
                      />
                    )}
                  </Fragment>
                ))}
                <li>
                  <button
                    onClick={() => setAddingType((value) => value ?? "stop")}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-[#D8CEB8] bg-[#F3EFE4] px-3 py-[11px] text-[13px] font-bold text-[#8a5f4d] transition-colors hover:border-[#E4562A]/45 hover:bg-[#EFE8D8] hover:text-[#C6532D]"
                  >
                    <Plus className="size-[15px]" />
                    Add item
                  </button>
                </li>
                {addingType && (
                  <li>
                    <div className="mb-2 grid grid-cols-2 gap-2 rounded-[13px] border border-[#E7DFCE] bg-white p-2">
                      {(["stop", "activity"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddingType(type)}
                          className={`rounded-[10px] px-3 py-2 text-xs font-bold capitalize transition ${
                            addingType === type
                              ? type === "activity"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-[#FBE7DD] text-[#B8431F]"
                              : "bg-[#F3EFE4] text-[#7a7264]"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <AddStopBox
                      onAdd={(result) => {
                        onAddStop(result, addingType);
                        setAddingType(null);
                      }}
                      onClose={() => setAddingType(null)}
                      placeholder={`Search a place for this ${addingType}`}
                    />
                  </li>
                )}
              </ol>
            </SortableContext>
          </DndContext>
          <div className="mt-auto pt-5">
            {endLeg && (
              <ol>
                <RouteLegSummary leg={endLeg} />
              </ol>
            )}
            {showStay && (
              <StayCard
                dayId={day.id}
                stay={stay}
                previousStay={previousStay}
                arrivalTime={stayArrivalTime}
                onSave={onSaveStay}
                onDelete={onDeleteStay}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteLegSummary({
  leg,
  mode = "driving",
  onModeChange,
}: {
  leg?: { distanceKm: number; durationMin: number };
  mode?: "driving" | "walking";
  onModeChange?: (mode: "driving" | "walking") => void;
}) {
  return (
    <li className="flex items-center gap-[9px] py-[9px] pl-5 pr-0 text-[#a89f88]">
      <span className="font-mono text-xs">↓</span>
      {onModeChange ? (
        <label className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#F3EFE4] px-2 py-1 text-xs font-bold text-[#7a7264]">
          {mode === "walking" ? (
            <Footprints className="size-3.5" />
          ) : (
            <Navigation className="size-3.5" />
          )}
          <select
            value={mode}
            onChange={(event) =>
              onModeChange(event.target.value as "driving" | "walking")
            }
            className="bg-transparent outline-none"
          >
            <option value="driving">Drive</option>
            <option value="walking">Walk</option>
          </select>
        </label>
      ) : null}
      <span className="text-xs font-semibold">
        {leg && leg.durationMin > 0 && leg.distanceKm > 0
          ? `${formatDuration(leg.durationMin)} · ${formatDistance(leg.distanceKm)}`
          : "Calculating route..."}
      </span>
    </li>
  );
}

function HeaderStat({
  value,
  tone,
}: {
  value: string;
  tone: "distance" | "drive" | "fuel";
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
        : {
            Icon: Fuel,
            iconBg: "#EEF3F5",
            iconBorder: "#D8E2E6",
            iconColor: "#5E86A3",
          };
  const Icon = config.Icon;

  return (
    <div className="min-w-0 flex-1 rounded-[13px] bg-[#F3EFE4] px-[13px] py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-[8px] border"
          style={{
            background: config.iconBg,
            borderColor: config.iconBorder,
            color: config.iconColor,
          }}
        >
          <Icon className="size-4" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 truncate font-mono text-[15px] font-bold leading-none">
          {value}
        </span>
      </div>
    </div>
  );
}
