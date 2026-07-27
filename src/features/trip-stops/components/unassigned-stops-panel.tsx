"use client";

import { Inbox, MoveRight, Plus } from "lucide-react";
import { Fragment, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type {
  StopPoint,
  TripActivityPlain,
  TripDayPlain,
} from "@/features/trips/lib/trip-view-model";
import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import { StopCard } from "@/features/trip-stops/components/stop-card";
import type { GeocodeResult } from "@/lib/integrations/geocode";

export function UnassignedStopsPanel({
  stops,
  days,
  onAddStop,
  onMoveStopToDay,
  onUpdateStop,
  onRemoveStop,
  onAddActivity,
  onUpdateActivity,
  onRemoveActivity,
  onReorderActivities,
  onSelectStop,
}: {
  stops: StopPoint[];
  days: TripDayPlain[];
  onAddStop: (result: GeocodeResult) => void;
  onMoveStopToDay: (stopId: string, dayId: string) => void;
  onUpdateStop: (stopId: string, patch: Partial<StopPoint>) => void;
  onRemoveStop: (stopId: string) => void;
  onAddActivity: (stopId: string, place: GeocodeResult) => void;
  onUpdateActivity: (
    activityId: string,
    patch: Partial<TripActivityPlain>,
  ) => void;
  onRemoveActivity: (activityId: string) => void;
  onReorderActivities: (stopId: string, orderedActivityIds: string[]) => void;
  /** Called with a stop's id when it's expanded/selected — lets the map recenter on it and show its activities. */
  onSelectStop?: (stopId: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fffaf0]">
      <div className="bg-[#FBF8F1] px-5 pb-5 pt-6">
        <div className="mb-0.5 flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#F3EFE4] text-[#8a8270]">
            <Inbox className="size-4" strokeWidth={2.4} />
          </span>
          <h1 className="m-0 truncate font-['Bricolage_Grotesque'] text-[26px] font-extrabold leading-none tracking-[-0.03em]">
            Unassigned stops
          </h1>
        </div>
        <p className="mb-0 mt-2 text-sm font-medium text-[#7a7264]">
          Places you haven&apos;t scheduled into a day yet. Add them here, then
          move each one to a day when you know where it fits.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <ol className="space-y-2">
          {stops.length === 0 && !adding && (
            <li className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No unassigned stops. Add a place here if you&apos;re not sure
              which day it belongs to yet.
            </li>
          )}
          {stops.map((stop, i) => (
            <Fragment key={stop.id}>
              <StopCard
                index={i}
                stop={stop}
                showSchedule={false}
                headerAction={
                  days.length > 0 && (
                    <MoveToDaySelect
                      days={days}
                      onSelect={(dayId) => onMoveStopToDay(stop.id, dayId)}
                    />
                  )
                }
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
            </Fragment>
          ))}
          <li>
            <button
              onClick={() => setAdding((v) => !v)}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-[#D8CEB8] bg-[#F3EFE4] px-3 py-[11px] text-[13px] font-bold text-[#8a5f4d] transition-colors hover:border-[#E4562A]/45 hover:bg-[#EFE8D8] hover:text-[#C6532D]"
            >
              <Plus className="size-[15px]" />
              Add stop
            </button>
          </li>
          {adding && (
            <li>
              <AddStopBox
                onAdd={(result) => {
                  onAddStop(result);
                  setAdding(false);
                }}
                onClose={() => setAdding(false)}
              />
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function MoveToDaySelect({
  days,
  onSelect,
}: {
  days: TripDayPlain[];
  onSelect: (dayId: string) => void;
}) {
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger
        className="h-7 w-auto gap-1 rounded-md border-0 bg-transparent px-1.5 text-muted-foreground shadow-none hover:bg-muted [&>span]:hidden"
        title="Move to day"
      >
        <MoveRight className="size-4" />
      </SelectTrigger>
      <SelectContent>
        {days.map((day, index) => (
          <SelectItem key={day.id} value={day.id}>
            {day.name || `Day ${index + 1}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
