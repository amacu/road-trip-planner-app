"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Footprints,
  Landmark,
  Loader2,
  MapPin,
  MessageCircleMore,
  Navigation,
  Plus,
  Route,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  StopPoint,
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

export type AiDayImportItem = {
  place: GeocodeResult;
  itemType: "stop" | "activity" | "overnight";
  travelMode: "driving" | "walking";
  stayType?: AiStayType;
  notesMarkdown: string;
  visitDurationMin: number | null;
};

type AiStayType = "hotel" | "tent" | "car" | "driving_overnight";
type AiStayPreference = AiStayType | "any";

export type AiDayRouteItem = AiDayImportItem & {
  itemType: "stop" | "activity";
};

export function DayPanel({
  day,
  index,
  isLastDay = false,
  dateLabel,
  stops,
  legs,
  startLeg,
  endLeg,
  onAddStop,
  onAddManualActivity,
  onImportStops,
  onUpdateStop,
  onRemoveStop,
  onReorderStops,
  copiedItemName,
  onCopyStop,
  onPasteCopiedStop,
  onSetDayStartTime,
  onLaunchNav,
  onOpenStopNotes,
  onSelectStop,
  stay,
  previousStay,
  showStay = true,
  onSaveStay,
  onDeleteStay,
}: {
  day: TripDayPlain;
  index: number;
  isLastDay?: boolean;
  dateLabel: string | null;
  stops: StopPoint[];
  legs: Array<{
    distanceKm: number;
    durationMin: number;
    returnDurationMin?: number;
  }>;
  startLeg?: {
    distanceKm: number;
    durationMin: number;
    returnDurationMin?: number;
  };
  endLeg?: {
    distanceKm: number;
    durationMin: number;
    returnDurationMin?: number;
  };
  onAddStop: (result: GeocodeResult, itemType: "stop" | "activity") => void;
  onAddManualActivity: (name: string, visitDurationMin: number) => void;
  onImportStops: (
    items: AiDayRouteItem[],
    replaceExisting: boolean,
    dayNotesMarkdown: string,
    dayStartTime: string,
  ) => Promise<boolean>;
  onUpdateStop: (stopId: string, patch: Partial<StopPoint>) => void;
  onRemoveStop: (stopId: string) => void;
  onReorderStops: (orderedStopIds: string[]) => void;
  copiedItemName?: string;
  onCopyStop: (stop: StopPoint) => void;
  onPasteCopiedStop: () => Promise<boolean>;
  onSetDayStartTime: (startTime: string) => void;
  onLaunchNav: () => void;
  onOpenStopNotes?: (stopId: string) => void;
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
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [walkingExcursionsCollapsed, setWalkingExcursionsCollapsed] =
    useState(false);
  const [expandedWalkingExcursionIds, setExpandedWalkingExcursionIds] =
    useState<Set<string>>(() => new Set());
  const addItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!addingType) return;
    addItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [addingType]);

  const scheduleStops =
    index === 0 && stops.length > 0
      ? [{ ...stops[0], visitDurationMin: null }, ...stops.slice(1)]
      : stops;
  const scheduleLegs = legs.map((leg, legIndex) => ({
    ...leg,
    durationMin:
      leg.durationMin +
      (legIndex === legs.length - 1 &&
      stops.at(-1)?.travelMode === "walking" &&
      !endLeg
        ? 0
        : (leg.returnDurationMin ?? 0)),
  }));
  const schedule = computeStopSchedule(
    day.startTime,
    scheduleStops,
    scheduleLegs,
    startLeg?.durationMin,
  );
  const lastDepartureTime = schedule[schedule.length - 1]?.departureTime;
  const stayArrivalTime =
    lastDepartureTime && endLeg
      ? addMinutesToTime(
          lastDepartureTime,
          endLeg.durationMin + (endLeg.returnDurationMin ?? 0),
        )
      : null;

  function moveStop(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= stops.length) return;
    const reordered = [...stops];
    const [movedStop] = reordered.splice(index, 1);
    if (!movedStop) return;
    reordered.splice(destination, 0, movedStop);
    onReorderStops(reordered.map((stop) => stop.id));
  }

  async function pasteCopiedStop() {
    if (isPasting || !copiedItemName) return;
    setIsPasting(true);
    try {
      await onPasteCopiedStop();
    } finally {
      setIsPasting(false);
    }
  }

  function walkingExcursionCountAfter(stopIndex: number) {
    let count = 0;
    for (let i = stopIndex + 1; i < stops.length; i += 1) {
      if (stops[i].travelMode !== "walking") break;
      count += 1;
    }
    return count;
  }

  function departureAfterWalkingExcursion(stopIndex: number) {
    const excursionCount = walkingExcursionCountAfter(stopIndex);
    if (excursionCount === 0) {
      return schedule[stopIndex]?.departureTime ?? null;
    }

    const lastExcursionIndex = stopIndex + excursionCount;
    const excursionDeparture =
      schedule[lastExcursionIndex]?.departureTime ?? null;
    if (!excursionDeparture) return null;

    const returnDurationMin =
      lastExcursionIndex < stops.length - 1
        ? (legs[lastExcursionIndex]?.returnDurationMin ?? 0)
        : (endLeg?.returnDurationMin ??
          legs[lastExcursionIndex - 1]?.returnDurationMin ??
          0);

    return addMinutesToTime(excursionDeparture, returnDurationMin);
  }

  function walkingExcursionAnchorId(stopIndex: number) {
    let anchorIndex = stopIndex;
    while (anchorIndex > 0 && stops[anchorIndex].travelMode === "walking") {
      anchorIndex -= 1;
    }
    return stops[anchorIndex]?.id;
  }

  function walkingExcursionIsHidden(stopIndex: number) {
    if (
      !walkingExcursionsCollapsed ||
      stopIndex === 0 ||
      stops[stopIndex].travelMode !== "walking"
    ) {
      return false;
    }
    const anchorId = walkingExcursionAnchorId(stopIndex);
    return !anchorId || !expandedWalkingExcursionIds.has(anchorId);
  }

  function collapseWalkingExcursion(anchorId: string) {
    if (!walkingExcursionsCollapsed) {
      setExpandedWalkingExcursionIds(
        new Set(
          stops
            .filter(
              (stop, index) =>
                stop.id !== anchorId &&
                stop.travelMode !== "walking" &&
                walkingExcursionCountAfter(index) > 0,
            )
            .map((stop) => stop.id),
        ),
      );
      setWalkingExcursionsCollapsed(true);
      return;
    }

    setExpandedWalkingExcursionIds((current) => {
      const next = new Set(current);
      next.delete(anchorId);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent lg:bg-[#FFFAF0]">
      <div className="fixed right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-[1200] flex items-center gap-1.5 lg:hidden">
        <button
          type="button"
          onClick={onLaunchNav}
          disabled={stops.length < 2}
          className="grid size-10 place-items-center rounded-[12px] bg-[#16130D] text-white shadow-[0_8px_18px_rgba(22,19,13,0.18)] disabled:cursor-not-allowed disabled:opacity-35"
          title="Start navigation in Google Maps"
          aria-label="Start navigation in Google Maps"
        >
          <Navigation className="size-4" />
        </button>
        {copiedItemName && (
          <button
            type="button"
            onClick={pasteCopiedStop}
            disabled={isPasting}
            className="grid size-10 place-items-center rounded-[12px] border border-[#E7A58F] bg-[#FBE7DD] text-brand shadow-sm transition-colors hover:bg-[#F8D8CA] disabled:opacity-45"
            title={`Paste ${copiedItemName}`}
            aria-label={`Paste ${copiedItemName}`}
          >
            {isPasting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ClipboardPaste className="size-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setAiImportOpen(true)}
          className="grid size-10 place-items-center rounded-[12px] border border-[#D8CEB8] bg-[#F8F4EC] text-[#8A5F4D] shadow-sm"
          title="Import day plan from AI"
          aria-label="Import day plan from AI"
        >
          <Sparkles className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setAddingType((value) => value ?? "stop")}
          className="grid size-10 place-items-center rounded-[12px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.2)]"
          title="Add stop or activity"
          aria-label="Add stop or activity"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <header className="relative z-10 hidden min-h-[70px] shrink-0 items-center border-b border-[#E4DBC8]/90 bg-[#FBF8F1]/95 px-4 py-3 shadow-[0_10px_24px_-18px_rgba(22,19,13,0.75)] backdrop-blur-md lg:flex">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.24)]">
              <CalendarDays className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[15px] font-black leading-tight text-foreground">
                Day {index + 1}
              </h1>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {dateLabel ?? "Date not set"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onLaunchNav}
              disabled={stops.length < 2}
              className="grid size-[34px] place-items-center rounded-[10px] border-0 bg-[#16130D] text-white shadow-[0_8px_18px_rgba(22,19,13,0.18)] transition-colors hover:bg-[#2a251b] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              title="Start navigation in Google Maps"
              aria-label="Start navigation in Google Maps"
            >
              <Navigation className="size-4" />
            </button>
            {copiedItemName && (
              <button
                type="button"
                onClick={pasteCopiedStop}
                disabled={isPasting}
                className="grid size-[34px] place-items-center rounded-[10px] border border-[#E7A58F] bg-[#FBE7DD] text-brand transition-colors hover:bg-[#F8D8CA] disabled:opacity-45"
                title={`Paste ${copiedItemName}`}
                aria-label={`Paste ${copiedItemName}`}
              >
                {isPasting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiImportOpen(true)}
              className="grid size-[34px] place-items-center rounded-[10px] border border-[#D8CEB8] bg-[#F3EFE4] text-[#8A5F4D] transition-colors hover:border-[#E4562A]/40 hover:bg-[#FBE7DD] hover:text-[#C6532D]"
              title="Import day plan from AI"
              aria-label="Import day plan from AI"
            >
              <Sparkles className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setAddingType((value) => value ?? "stop")}
              className="grid size-[34px] place-items-center rounded-[10px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.2)] transition-colors hover:bg-[#cf4822]"
              title="Add item"
              aria-label="Add item"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 lg:px-3 lg:pb-32 lg:pt-3.5">
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
              {stops[0]?.hasLocation ? (
                <RouteLegSummary
                  leg={startLeg}
                  mode={stops[0]?.travelMode}
                  onModeChange={(travelMode) =>
                    stops[0] && onUpdateStop(stops[0].id, { travelMode })
                  }
                />
              ) : (
                <EmptyRouteConnector />
              )}
            </ol>
          )}
          <ol>
            {stops.length === 0 && !addingType && (
              <li className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No stops yet. Add a stop to start planning this day.
              </li>
            )}
            {stops.map((stop, i) => (
              <Fragment key={stop.id}>
                {!walkingExcursionIsHidden(i) && (
                  <StopCard
                    index={i}
                    stop={stop}
                    hiddenWalkingExcursionCount={
                      walkingExcursionsCollapsed &&
                      stop.travelMode !== "walking" &&
                      !expandedWalkingExcursionIds.has(stop.id)
                        ? walkingExcursionCountAfter(i)
                        : 0
                    }
                    onExpandWalkingExcursions={() =>
                      setExpandedWalkingExcursionIds((current) => {
                        const next = new Set(current);
                        next.add(stop.id);
                        return next;
                      })
                    }
                    isWalkingExcursion={stop.travelMode === "walking"}
                    showDriveSpine={
                      stop.travelMode === "walking" &&
                      (!stop.hasLocation ||
                        stops
                          .slice(i + 1)
                          .some((item) => item.travelMode === "driving"))
                    }
                    isFirst={i === 0}
                    isLast={i === stops.length - 1}
                    isTripStart={index === 0 && i === 0}
                    isTripFinish={isLastDay && i === stops.length - 1}
                    arrivalTime={schedule[i]?.arrivalTime ?? null}
                    departureTime={
                      stop.travelMode !== "walking"
                        ? departureAfterWalkingExcursion(i)
                        : (schedule[i]?.departureTime ?? null)
                    }
                    dayStartTime={day.startTime ?? ""}
                    onSetDayStartTime={onSetDayStartTime}
                    onUpdate={(patch) => onUpdateStop(stop.id, patch)}
                    onCopy={
                      stop.id.startsWith("optimistic-stop-")
                        ? undefined
                        : () => onCopyStop(stop)
                    }
                    onRemove={() => onRemoveStop(stop.id)}
                    onMoveUp={() => moveStop(i, -1)}
                    onMoveDown={() => moveStop(i, 1)}
                    onOpenNotes={() => onOpenStopNotes?.(stop.id)}
                    onSelect={() => onSelectStop?.(stop.id)}
                  />
                )}
                {i < stops.length - 1 && !walkingExcursionIsHidden(i + 1) && (
                  <>
                    {stops[i + 1].hasLocation ? (
                      <RouteLegSummary
                        leg={legs[i]}
                        mode={stops[i + 1].travelMode}
                        showDriveBranch={
                          stops[i + 1].travelMode === "walking" &&
                          stops
                            .slice(i + 2)
                            .some((item) => item.travelMode === "driving")
                        }
                        onModeChange={(travelMode) =>
                          onUpdateStop(stops[i + 1].id, { travelMode })
                        }
                        onCollapseExcursion={
                          stop.travelMode !== "walking" &&
                          stops[i + 1].travelMode === "walking" &&
                          (!walkingExcursionsCollapsed ||
                            expandedWalkingExcursionIds.has(stop.id))
                            ? () => collapseWalkingExcursion(stop.id)
                            : undefined
                        }
                      />
                    ) : (
                      <EmptyRouteConnector />
                    )}
                  </>
                )}
              </Fragment>
            ))}
            {addingType && (
              <li ref={addItemRef} className="mt-2">
                <div className="rounded-[18px] border border-[#D8CEB8] bg-[#F8F4EC] p-3 shadow-[0_10px_26px_rgba(22,19,13,0.08)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-black text-foreground">
                        Add route item
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                        Choose its role in this day
                      </p>
                    </div>
                    <div className="flex rounded-[11px] bg-[#EEE7DA] p-1">
                      {(
                        [
                          ["stop", "Stop", MapPin],
                          ["activity", "Activity", Landmark],
                        ] as const
                      ).map(([type, label, Icon]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddingType(type)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10.5px] font-bold transition ${
                            addingType === type
                              ? type === "activity"
                                ? "bg-[#7C5CBF] text-white shadow-sm"
                                : "bg-brand text-brand-foreground shadow-sm"
                              : "text-[#7A7264] hover:text-foreground"
                          }`}
                        >
                          <Icon className="size-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AddStopBox
                    embedded
                    onAdd={(result) => {
                      onAddStop(result, addingType);
                      setAddingType(null);
                    }}
                    onAddWithoutLocation={
                      addingType === "activity"
                        ? (name, visitDurationMin) => {
                            onAddManualActivity(name, visitDurationMin);
                            setAddingType(null);
                          }
                        : undefined
                    }
                    onClose={() => setAddingType(null)}
                    placeholder={`Search a place for this ${addingType}`}
                    helpText={
                      addingType === "activity"
                        ? "Choose a place, or add a schedule-only activity without a location."
                        : "Search by name or address, or paste a Google Maps link."
                    }
                  />
                </div>
              </li>
            )}
          </ol>
          <div>
            {endLeg && (
              <ol>
                <RouteLegSummary leg={endLeg} />
              </ol>
            )}
            {showStay && (
              <div className={endLeg ? undefined : "mt-2"}>
                <StayCard
                  dayId={day.id}
                  stay={stay}
                  previousStay={previousStay}
                  arrivalTime={stayArrivalTime}
                  onSave={onSaveStay}
                  onDelete={onDeleteStay}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AiDayImportDialog
        open={aiImportOpen}
        onOpenChange={setAiImportOpen}
        dayNumber={index + 1}
        dateLabel={dateLabel}
        existingStops={stops}
        previousStay={previousStay}
        hasStay={Boolean(stay)}
        onImport={async (
          items,
          replaceExisting,
          stayPreference,
          dayNotesMarkdown,
          dayStartTime,
        ) => {
          const routeItems = items.filter(
            (item): item is AiDayRouteItem => item.itemType !== "overnight",
          );
          const routeImported =
            routeItems.length === 0
              ? true
              : await onImportStops(
                  routeItems,
                  replaceExisting,
                  dayNotesMarkdown,
                  dayStartTime,
                );
          if (!routeImported) return false;

          const overnight =
            !stay || replaceExisting
              ? [...items]
                  .reverse()
                  .find((item) => item.itemType === "overnight")
              : undefined;
          if (!overnight) return true;

          const stayType =
            stayPreference === "any"
              ? (overnight.stayType ?? "hotel")
              : stayPreference;
          const isOvernightDrive = stayType === "driving_overnight";
          return onSaveStay({
            afterDayId: day.id,
            name: isOvernightDrive ? "Driving overnight" : overnight.place.name,
            stayType,
            status: "planned",
            address: isOvernightDrive ? "" : overnight.place.address,
            latitude: isOvernightDrive ? null : overnight.place.lat,
            longitude: isOvernightDrive ? null : overnight.place.lng,
            countryCode: isOvernightDrive ? null : overnight.place.countryCode,
            checkInTime: null,
            checkOutTime: null,
            price: null,
            currency: "PLN",
            notes: overnight.notesMarkdown || "AI-suggested overnight area.",
          });
        }}
      />
    </div>
  );
}

function AiDayImportDialog({
  open,
  onOpenChange,
  dayNumber,
  dateLabel,
  existingStops,
  previousStay,
  hasStay,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  dateLabel: string | null;
  existingStops: StopPoint[];
  previousStay?: TripStayPlain;
  hasStay: boolean;
  onImport: (
    items: AiDayImportItem[],
    replaceExisting: boolean,
    stayPreference: AiStayPreference,
    dayNotesMarkdown: string,
    dayStartTime: string,
  ) => Promise<boolean>;
}) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [keepExisting, setKeepExisting] = useState(false);
  const [stayPreference, setStayPreference] = useState<AiStayPreference>("any");
  const [planningMode, setPlanningMode] = useState<"ready" | "collaborate">(
    "ready",
  );
  const existingContext =
    keepExisting && existingStops.length > 0
      ? existingStops
          .map((stop, index) => `${index + 1}. ${stop.name} — ${stop.address}`)
          .join("\n")
      : "Nie uwzględniaj obecnych miejsc — zaplanuj dzień od początku.";
  const startContext = previousStay
    ? previousStay.stayType === "driving_overnight"
      ? "Poprzedni dzień zakończył się nocną jazdą. Ten dzień zaczyna się w trasie, kontynuując poprzedni kierunek."
      : `Ten dzień MUSI zacząć się od noclegu z poprzedniego dnia: ${previousStay.name}${previousStay.address ? ` — ${previousStay.address}` : ""}${previousStay.lat != null && previousStay.lng != null ? ` (${previousStay.lat}, ${previousStay.lng})` : ""}. Traktuj to jako punkt startowy i licz travelMode pierwszego miejsca właśnie od tej lokalizacji.`
    : "Brak noclegu z poprzedniego dnia. Sam dobierz logiczny początek trasy.";
  const accommodationPreferenceRule =
    stayPreference === "hotel"
      ? 'Ustaw stayType "hotel" i wybierz miasto, dzielnicę lub rejon z dobrą bazą hotelową oraz wygodnym dojazdem. Nie wskazuj konkretnego hotelu.'
      : stayPreference === "tent"
        ? 'Ustaw stayType "tent" i wybierz rejon odpowiedni do legalnego i bezpiecznego nocowania pod namiotem, najlepiej w pobliżu terenów biwakowych lub campingowych. Nie wskazuj konkretnego obiektu.'
        : stayPreference === "car"
          ? 'Ustaw stayType "car" i wybierz bezpieczny, legalny i praktyczny rejon do nocowania w samochodzie lub kamperze, z możliwością postoju i rozsądnym dojazdem.'
          : stayPreference === "driving_overnight"
            ? 'Ustaw stayType "driving_overnight". Nie planuj postoju noclegowego; zakończ dzień logicznym kierunkiem dalszej nocnej jazdy.'
            : 'Sam wybierz najbardziej sensowny stayType spośród "hotel", "tent", "car" albo "driving_overnight". Lokalizacja musi pasować do wybranego typu: baza hotelowa dla hotelu, legalny rejon biwakowy dla namiotu albo bezpieczny postój dla samochodu.';
  const conversationRule =
    planningMode === "ready"
      ? "Od razu przygotuj kompletny plan. Zwróć WYŁĄCZNIE poprawny JSON zgodny z formatem poniżej, bez dodatkowego komentarza."
      : `NIE twórz jeszcze JSON-u ani finalnego planu. Najpierw pomóż mi zaplanować ten dzień w normalnej rozmowie: zapytaj o moje preferencje, tempo, zainteresowania, budżet i ograniczenia oraz proponuj sensowne warianty. Odpowiadaj zwykłym tekstem.

Dopiero gdy wyraźnie poproszę o gotowy JSON (np. napiszę „wygeneruj JSON”), zwróć WYŁĄCZNIE JSON zgodny z formatem i zasadami poniżej, bez dodatkowego komentarza.`;
  const prompt = `Pomóż mi zaplanować atrakcyjny i realistyczny dzień ${dayNumber}${dateLabel ? ` (${dateLabel})` : ""} podczas road tripu.

Punkt startowy dnia:
${startContext}

Miejsca już dodane do dnia:
${existingContext}

${conversationRule}

Format finalnego JSON-u:
{
  "dayStartTime": "08:30",
  "dayNotesMarkdown": "## Plan dnia\\nKrótki opis charakteru dnia i najważniejsze wskazówki.",
  "items": [
    {
      "name": "Nazwa miejsca",
      "type": "stop",
      "travelMode": "driving",
      "stayType": "hotel",
      "visitDurationMin": 90,
      "notesMarkdown": "### Dlaczego warto\\n- Krótka wskazówka\\n- Co zobaczyć",
      "address": "Pełny adres lub miejscowość i kraj",
      "latitude": 52.2297,
      "longitude": 21.0122,
      "countryCode": "PL"
    }
  ]
}

Zasady:
- dayStartTime jest obowiązkową sugerowaną godziną rozpoczęcia dnia w 24-godzinnym formacie "HH:mm"; dobierz ją realistycznie do trasy, czasu przejazdów, godzin otwarcia i planowanych aktywności;
- dayNotesMarkdown jest obowiązkowym opisem CAŁEGO dnia; podsumuj charakter trasy, główne atrakcje, tempo dnia i najważniejsze wskazówki organizacyjne w czytelnym Markdown;
- dayNotesMarkdown powinien mieć 2–4 krótkie akapity lub listy i nie może powtarzać wszystkich notatek miejsc słowo w słowo;
- zwróć od 1 do 12 dodatkowych miejsc w logicznej kolejności przejazdu;
- type ustaw jako "stop" dla głównego punktu trasy, "activity" dla atrakcji, zwiedzania, restauracji i krótszych punktów programu albo "overnight" wyłącznie dla sugerowanej lokalizacji noclegowej;
- pole stayType ustawiaj tylko dla elementu typu "overnight";
- dla każdego "stop" i "activity" visitDurationMin jest obowiązkową liczbą całkowitą oznaczającą realistyczny sugerowany czas pobytu w minutach (od 15 do 720); dla "overnight" ustaw null;
- dla KAŻDEGO elementu typu "stop" oraz "activity" pole notesMarkdown jest OBOWIĄZKOWE i nie może być puste;
- w notesMarkdown dodaj przydatny opis miejsca: dlaczego warto je odwiedzić, co konkretnie zobaczyć lub zrobić, praktyczne wskazówki oraz — jeśli są znane — godziny otwarcia, informacje o biletach lub parkingu;
- formatuj notesMarkdown czytelnie: używaj krótkich nagłówków, akapitów, 2–5 punktów listy, **pogrubień** i linków w formacie [nazwa](https://adres.pl); nie używaj HTML;
- możesz dodawać odnośniki do oficjalnych stron miejsc, biletów lub wiarygodnych źródeł, ale NIE wymyślaj adresów URL; jeśli nie znasz pewnego linku, pomiń go;
- travelMode oznacza sposób dotarcia Z POPRZEDNIEGO punktu do tego miejsca: ustaw "walking", gdy odcinek jest sensowny pieszo, albo "driving", gdy należy jechać samochodem;
${keepExisting && existingStops.length > 0 ? "- dla pierwszego zwracanego miejsca uwzględnij sposób dotarcia z ostatniego miejsca już dodanego do dnia;" : '- dla pierwszego miejsca użyj travelMode "driving";'}
${hasStay && keepExisting ? '- nocleg dla tego dnia jest już zdefiniowany i ma zostać zachowany; NIE dodawaj elementu typu "overnight" ani żadnej innej sugestii noclegu;' : `- ostatni element musi mieć type "overnight" i kończyć dzień w sposób odpowiedni dla noclegu lub dalszej jazdy;\n- ${accommodationPreferenceRule}\n- dla overnight podaj nazwę i współrzędne reprezentujące wybrany rejon, a nie konkretny hotel lub obiekt;`}
${keepExisting ? "- nie powtarzaj miejsc, które są już dodane; zwróć tylko nowe uzupełnienia;" : "- przygotuj kompletny plan od początku; obecne miejsca zostaną zastąpione wynikiem;"}
- użyj rzeczywistych miejsc i możliwie dokładnych współrzędnych;
- latitude i longitude muszą być liczbami, nie tekstem;
- countryCode to dwuliterowy kod ISO zapisany wielkimi literami.`;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the prompt. Select and copy it manually.");
    }
  }

  async function importResponse() {
    setError(null);
    let parsedPlan: AiDayImportPlan;
    try {
      parsedPlan = parseAiPlan(response);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "The AI response is not valid.",
      );
      return;
    }

    setImporting(true);
    const success = await onImport(
      parsedPlan.items,
      !keepExisting,
      stayPreference,
      parsedPlan.dayNotesMarkdown,
      parsedPlan.dayStartTime,
    );
    setImporting(false);
    if (!success) {
      setError("Some places could not be saved. Check the day and try again.");
      return;
    }

    setResponse("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E7DFCE] bg-[#FBF8F1] sm:max-w-[680px] sm:rounded-[22px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-['Bricolage_Grotesque'] text-2xl font-extrabold">
            <Sparkles className="size-5 text-[#E4562A]" />
            Import day from AI
          </DialogTitle>
          <DialogDescription>
            Copy the prompt to your AI assistant, then paste its JSON response
            below.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            How should AI help?
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-[15px] border border-[#E7DFCE] bg-[#EEE8DC] p-1.5 shadow-inner">
            {(
              [
                ["ready", "Ready plan", Route],
                ["collaborate", "Plan together", MessageCircleMore],
              ] as const
            ).map(([value, label, Icon]) => {
              const active = planningMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlanningMode(value)}
                  className={`group flex min-h-12 items-center justify-center gap-2 rounded-[11px] border px-3 text-sm font-bold transition-all ${
                    active
                      ? "border-[#E7DFCE] bg-[#FFFDF8] text-[#16130D] shadow-[0_3px_10px_rgba(50,42,25,0.10)]"
                      : "border-transparent text-[#7A7264] hover:bg-white/45 hover:text-[#433D32]"
                  }`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-[9px] transition-colors ${
                      active
                        ? "bg-[#FBE7DD] text-[#D95128]"
                        : "bg-[#E5DED0] text-[#8A8270] group-hover:bg-[#F3EFE4]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          <p className="px-1 pt-2.5 text-xs leading-relaxed text-[#7A7264]">
            {planningMode === "ready"
              ? "AI will immediately return a complete JSON day plan ready to import."
              : "AI will discuss this day with you first and return JSON only when you ask for it."}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-[13px] border border-[#E7DFCE] bg-[#F3EFE4] p-3">
          <input
            type="checkbox"
            checked={keepExisting}
            onChange={(event) => setKeepExisting(event.target.checked)}
            className="mt-0.5 size-4 accent-[#E4562A]"
          />
          <span>
            <span className="block text-sm font-bold text-[#16130D]">
              Keep places already in this day
            </span>
            <span className="mt-0.5 block text-xs text-[#7A7264]">
              {keepExisting
                ? "AI will keep the current route and accommodation, then suggest only additions."
                : "AI will plan from scratch and replace the current route and accommodation."}
            </span>
          </span>
        </label>

        <div className="rounded-[13px] border border-[#E7DFCE] bg-white p-3.5">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            Prompt settings · accommodation
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["any", "Any"],
                ["hotel", "Hotel"],
                ["tent", "Tent"],
                ["car", "Car"],
                ["driving_overnight", "Night drive"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={hasStay && keepExisting}
                onClick={() => setStayPreference(value)}
                className={`rounded-[10px] border px-2 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  stayPreference === value
                    ? "border-[#E4562A] bg-[#FBE7DD] text-[#B8431F]"
                    : "border-[#E7DFCE] bg-white text-[#6A6353] hover:bg-[#F3EFE4]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {hasStay && keepExisting && (
            <p className="mt-2 text-xs font-medium text-[#8A8270]">
              This day already has accommodation. The existing stay will not be
              changed while keeping current places.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[13px] border border-[#E7DFCE] bg-white p-3.5">
          <div>
            <div className="text-sm font-bold text-[#16130D]">
              AI planning prompt
            </div>
            <p className="mt-0.5 text-xs text-[#7A7264]">
              {planningMode === "ready"
                ? "Copy it to get an import-ready JSON day plan."
                : "Copy it to discuss the day first; ask for JSON when the plan is ready."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#16130D] px-3.5 text-xs font-bold text-white hover:bg-[#2A251B]"
          >
            {copied ? (
              <Check className="size-4 text-[#8FD3AE]" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            Paste the AI response
          </div>
          <textarea
            value={response}
            onChange={(event) => {
              setResponse(event.target.value);
              setError(null);
            }}
            placeholder={
              '{"items":[{"name":"…","type":"activity","travelMode":"walking","address":"…","latitude":0,"longitude":0,"countryCode":"PL"}]}'
            }
            className="h-40 w-full resize-none rounded-[13px] border border-[#D8CEB8] bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-[#E4562A]/20"
          />
          {error && (
            <p className="mt-2 text-xs font-semibold text-[#B8431F]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-[11px] px-4 text-sm font-bold text-[#6A6353] hover:bg-[#F0EADB]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importResponse()}
            disabled={!response.trim() || importing}
            className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#16130D] px-4 text-sm font-bold text-white hover:bg-[#2A251B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {importing ? "Importing…" : "Import items"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AiDayImportPlan = {
  dayStartTime: string;
  dayNotesMarkdown: string;
  items: AiDayImportItem[];
};

function parseAiPlan(raw: string): AiDayImportPlan {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!cleaned) throw new Error("Paste the response generated by AI.");

  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch {
    throw new Error("This is not valid JSON. Ask the AI to return JSON only.");
  }

  let items: unknown[] | null = null;
  let dayNotesMarkdown = "";
  let dayStartTime = "";
  if (Array.isArray(value)) {
    items = value;
  } else if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    if (Array.isArray(root.items)) items = root.items;
    else if (Array.isArray(root.stops)) items = root.stops;
    if (typeof root.dayNotesMarkdown === "string") {
      dayNotesMarkdown = root.dayNotesMarkdown.trim().slice(0, 6000);
    }
    if (typeof root.dayStartTime === "string") {
      dayStartTime = root.dayStartTime.trim();
    }
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dayStartTime)) {
    throw new Error(
      'The response must contain a valid "dayStartTime" in HH:mm format.',
    );
  }
  if (!items || items.length === 0) {
    throw new Error('The response must contain a non-empty "items" array.');
  }
  if (items.length > 20) {
    throw new Error("Import at most 20 places at once.");
  }

  const parsedItems: AiDayImportItem[] = items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Place ${index + 1} has an invalid format.`);
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const address =
      typeof record.address === "string" ? record.address.trim() : "";
    const lat = Number(record.latitude ?? record.lat);
    const lng = Number(record.longitude ?? record.lng);
    const rawCountryCode =
      typeof record.countryCode === "string"
        ? record.countryCode.trim().toUpperCase()
        : null;
    const itemType =
      record.type === "activity"
        ? "activity"
        : record.type === "overnight"
          ? "overnight"
          : "stop";
    const travelMode = record.travelMode === "walking" ? "walking" : "driving";
    const stayType =
      record.stayType === "tent" ||
      record.stayType === "car" ||
      record.stayType === "driving_overnight"
        ? record.stayType
        : "hotel";
    const notesMarkdown =
      typeof record.notesMarkdown === "string"
        ? record.notesMarkdown.trim().slice(0, 6000)
        : "";
    const visitDurationMin =
      itemType === "overnight" ? null : Number(record.visitDurationMin);

    if (!name) throw new Error(`Place ${index + 1} is missing a name.`);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error(`Place ${index + 1} has an invalid latitude.`);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error(`Place ${index + 1} has an invalid longitude.`);
    }
    if (rawCountryCode && !/^[A-Z]{2}$/.test(rawCountryCode)) {
      throw new Error(`Place ${index + 1} has an invalid country code.`);
    }
    if (
      itemType !== "overnight" &&
      (!Number.isInteger(visitDurationMin) ||
        visitDurationMin == null ||
        visitDurationMin < 15 ||
        visitDurationMin > 720)
    ) {
      throw new Error(
        `Place ${index + 1} has an invalid visitDurationMin (use 15–720 minutes).`,
      );
    }

    return {
      itemType,
      travelMode,
      stayType: itemType === "overnight" ? stayType : undefined,
      notesMarkdown,
      visitDurationMin,
      place: {
        name: name.slice(0, 120),
        address: (address || name).slice(0, 300),
        lat,
        lng,
        countryCode: rawCountryCode,
      },
    };
  });

  return { dayStartTime, dayNotesMarkdown, items: parsedItems };
}

function EmptyRouteConnector() {
  return (
    <li aria-hidden className="relative h-5">
      <span className="absolute inset-y-0 left-[18px] border-l border-dashed border-[#D1C7B2]" />
    </li>
  );
}

function RouteLegSummary({
  leg,
  mode = "driving",
  showDriveBranch = false,
  onModeChange,
  onCollapseExcursion,
}: {
  leg?: { distanceKm: number; durationMin: number };
  mode?: "driving" | "walking";
  showDriveBranch?: boolean;
  onModeChange?: (mode: "driving" | "walking") => void;
  onCollapseExcursion?: () => void;
}) {
  const isWalking = mode === "walking";

  return (
    <li
      className={`relative flex min-h-9 items-center gap-2 py-1.5 pr-1 text-[#9D9483] ${
        isWalking ? "pl-[66px]" : "pl-[34px]"
      }`}
    >
      {showDriveBranch && (
        <span className="absolute bottom-0 left-[18px] top-0 border-l border-dashed border-[#D1C7B2]" />
      )}
      {!isWalking && (
        <>
          <span className="absolute bottom-3 left-[18px] top-0 border-l border-dashed border-[#D1C7B2]" />
          <ChevronDown
            className="absolute bottom-0 left-[18px] z-[1] size-3 -translate-x-1/2 text-[#BEB39D]"
            strokeWidth={2.2}
          />
        </>
      )}
      {onModeChange ? (
        <label className="group/mode inline-flex items-center gap-1 text-[10.5px] font-bold text-[#8C8373] transition-colors hover:text-foreground">
          {mode === "walking" ? (
            <Footprints className="size-3 text-[#6E8B78]" />
          ) : (
            <Navigation className="size-3 text-[#8A8270]" />
          )}
          <select
            value={mode}
            onChange={(event) =>
              onModeChange(event.target.value as "driving" | "walking")
            }
            className="appearance-none bg-transparent pr-0.5 outline-none"
            aria-label="Travel mode"
          >
            <option value="driving">Drive</option>
            <option value="walking">Walk</option>
          </select>
          {isWalking && (
            <Undo2
              className="ml-0.5 size-3 text-[#6E8B78]"
              aria-label="Returns to the previous stop"
            />
          )}
        </label>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#8C8373]">
          {isWalking ? (
            <Footprints className="size-3 text-[#6E8B78]" />
          ) : (
            <Navigation className="size-3 text-[#8A8270]" />
          )}
          {isWalking ? "Walk" : "Drive"}
        </span>
      )}
      <span className="size-0.5 rounded-full bg-[#C5BBA5]" aria-hidden />
      <span className="font-mono text-[10.5px] font-medium text-[#9D9483]">
        {leg && leg.durationMin > 0 && leg.distanceKm > 0
          ? `${formatDuration(leg.durationMin)} · ${formatDistance(leg.distanceKm)}`
          : "Calculating route..."}
      </span>
      {onCollapseExcursion && (
        <button
          type="button"
          onClick={onCollapseExcursion}
          className="ml-auto grid size-5 shrink-0 place-items-center rounded-full text-[#6E8B78] transition-colors hover:bg-[#E4F0E8] hover:text-[#376B4E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CB7A6]"
          title="Collapse this stop's walking activities"
          aria-label="Collapse this stop's walking activities"
        >
          <ChevronUp className="size-3" />
        </button>
      )}
    </li>
  );
}
