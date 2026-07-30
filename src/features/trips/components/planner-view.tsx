"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  Compass,
  LayoutDashboard,
  Map as MapIcon,
  MapPinned,
  NotebookText,
  Plus,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { LogoMark } from "@/components/shared/app-logo";
import {
  createTripPackingItemAction,
  deleteTripPackingItemAction,
  importAiPackingListAction,
  updateTripPackingCategoriesAction,
  updateTripPackingItemAction,
} from "@/features/trip-packing/actions";
import {
  buildFuelPlan,
  estimateFuelCostPln,
} from "@/features/fuel/lib/fuel-plan";
import {
  createTripDayAction,
  deleteTripDayAction,
  reorderTripDaysAction,
  updateTripDayAction,
} from "@/features/trip-days/actions";
import type { AiDayRouteItem } from "@/features/trip-days/components/day-panel";
import {
  deleteTripStayAction,
  saveTripStayAction,
  updateTripStayAction,
} from "@/features/trip-stays/actions";
import {
  createTripStopAction,
  deleteTripStopAction,
  duplicateTripStopAction,
  importTripDayStopsAction,
  reorderTripStopsAction,
  updateTripStopAction,
} from "@/features/trip-stops/actions";
import { DayListCard } from "@/features/trips/components/day-list-card";
import type { AiTripDay } from "@/features/trips/components/ai-trip-import-dialog";
import { NewTripDialog } from "@/features/trips/components/new-trip-dialog";
import { TripSummaryCard } from "@/features/trips/components/trip-summary-card";
import { deleteTripAction, updateTripAction } from "@/features/trips/actions";
import type {
  StopPoint,
  TripPackingItemPlain,
  TripPlain,
  TripStayPlain,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import { useRouteMetrics } from "@/features/trips/hooks/use-route-metrics";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import type { FuelCountryPrice } from "@/lib/integrations/fuel-prices";
import { openInGoogleMaps } from "@/lib/integrations/google-maps";
import { buildPackingTripContext } from "@/features/trips/lib/trip-export";
import type { TripUpdateInput } from "@/lib/validators/trip";
import type { TripStayInput } from "@/lib/validators/trip-stay";
import type {
  PackingCategory,
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";
import { cn, randomId } from "@/lib/utils";

const HomeScreen = dynamic(() =>
  import("@/features/home/components/home-screen").then(
    (module) => module.HomeScreen,
  ),
);
const DayPanel = dynamic(() =>
  import("@/features/trip-days/components/day-panel").then(
    (module) => module.DayPanel,
  ),
);
const RouteNotesPanel = dynamic(() =>
  import("@/features/trip-days/components/route-notes-panel").then(
    (module) => module.RouteNotesPanel,
  ),
);
const OverviewView = dynamic(() =>
  import("@/features/trips/components/overview-view").then(
    (module) => module.OverviewView,
  ),
);
const FuelDashboard = dynamic(() =>
  import("@/features/fuel/components/fuel-dashboard").then(
    (module) => module.FuelDashboard,
  ),
);
const MapView = dynamic(
  () =>
    import("@/features/trip-stops/components/map-view").then(
      (module) => module.MapView,
    ),
  { ssr: false },
);
const AiTripImportDialog = dynamic(() =>
  import("@/features/trips/components/ai-trip-import-dialog").then(
    (module) => module.AiTripImportDialog,
  ),
);

type TabKey = "overview" | "planner" | "fuel";
type ViewKey = TabKey | "landing";

type TripSwitcherItem = {
  id: string;
  name: string;
  heroImageUrl: string | null;
  startDate: string | null;
  dayCount: number;
};

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  planner: "Planner",
  fuel: "Travel",
};

const TAB_ICONS = {
  overview: LayoutDashboard,
  planner: MapPinned,
  fuel: Compass,
} satisfies Record<TabKey, typeof LayoutDashboard>;

/**
 * A day's calendar date is always derived from the trip's start date plus
 * its position in the (gap-free, displayed) day list — never stored
 * per-day. `dayIndex` must be the day's index in the rendered `days` array
 * (0-based), not its database `dayNumber`, so dates stay contiguous with
 * the "Day N" labels even after a day in the middle of the trip is
 * deleted and dayNumbers become non-contiguous (e.g. 1, 3, 4 in the DB
 * still render/date as Day 1, Day 2, Day 3).
 */
function getDayDate(dayIndex: number, tripStartDate: string | null) {
  if (!tripStartDate) return null;

  const date = new Date(`${tripStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

function formatDayDateLabel(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatWeekdayLabel(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

function stayAsStop(stay: TripStayPlain, id: string): StopPoint {
  return {
    id,
    name: stay.name,
    address: stay.address,
    lat: stay.lat ?? 0,
    lng: stay.lng ?? 0,
    hasLocation: stay.lat != null && stay.lng != null,
    countryCode: stay.countryCode,
    itemType: "stop",
    travelMode: "driving",
    startTime: null,
    endTime: null,
    category: null,
    description: null,
    visitDurationMin: null,
    notes: stay.notes,
    activities: [],
  };
}

function drivingRouteStops(stops: StopPoint[]) {
  return stops.filter(
    (stop, index) => index === 0 || stop.travelMode !== "walking",
  );
}

function inheritMissingLocations(
  stops: StopPoint[],
  initialAnchor?: StopPoint,
) {
  let anchor = initialAnchor?.hasLocation ? initialAnchor : undefined;
  return stops.map((stop, index) => {
    if (stop.hasLocation) {
      anchor = stop;
      return stop;
    }

    const fallback =
      anchor ?? stops.slice(index + 1).find((item) => item.hasLocation);
    return fallback ? { ...stop, lat: fallback.lat, lng: fallback.lng } : stop;
  });
}

function routeStopsWithSelectedExcursion(
  stops: StopPoint[],
  selectedStopId: string | null,
) {
  if (!selectedStopId) return drivingRouteStops(stops);

  const selectedIndex = stops.findIndex((stop) => stop.id === selectedStopId);
  if (selectedIndex < 0) return drivingRouteStops(stops);

  let anchorIndex = selectedIndex;
  while (anchorIndex > 0 && stops[anchorIndex].travelMode === "walking") {
    anchorIndex -= 1;
  }

  return stops.filter((stop, index) => {
    if (index === 0 || stop.travelMode !== "walking") return true;
    if (index <= anchorIndex) return false;
    return !stops
      .slice(anchorIndex + 1, index)
      .some((item) => item.travelMode !== "walking");
  });
}

export function PlannerView({
  trip,
  vehicles,
  trips,
  currentUserId,
  currentUserFullName,
  currentUserEmail,
  currentUserAvatarUrl,
  initialFuelPrices,
}: {
  trip: TripPlain;
  vehicles: VehiclePlain[];
  trips: TripSwitcherItem[];
  currentUserId: string;
  currentUserFullName?: string | null;
  currentUserEmail?: string | null;
  currentUserAvatarUrl?: string | null;
  initialFuelPrices: FuelCountryPrice[];
}) {
  const router = useRouter();
  // Local, optimistically-mutable mirror of trip.days. Drag-and-drop (and
  // other mutations) update this immediately so the UI never "snaps back"
  // while waiting on the server; it's resynced whenever fresh props arrive
  // from router.refresh().
  const [days, setDays] = useState<TripPlain["days"]>(trip.days);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [isImportingTrip, setIsImportingTrip] = useState(false);
  const [tripAiOpen, setTripAiOpen] = useState(false);
  const dayWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stopReorderQueuesRef = useRef(new Map<string, Promise<void>>());
  const stopReorderVersionsRef = useRef(new Map<string, number>());
  useEffect(() => {
    setDays(trip.days);
  }, [trip.days]);

  const [stays, setStays] = useState<TripStayPlain[]>(trip.stays);
  useEffect(() => {
    setStays(trip.stays);
  }, [trip.stays]);

  const [packingItems, setPackingItems] = useState(trip.packingItems);
  const [packingCategories, setPackingCategories] = useState(
    trip.packingCategories,
  );
  const packingItemsRef = useRef(trip.packingItems);
  useEffect(() => {
    setPackingCategories(trip.packingCategories);
  }, [trip.packingCategories]);
  const pendingPackingUpdates = useRef(
    new Map<
      string,
      {
        patch: TripPackingItemUpdateInput;
        before: Partial<TripPackingItemPlain>;
        timer: ReturnType<typeof setTimeout>;
        resolvers: Array<(success: boolean) => void>;
      }
    >(),
  );
  useEffect(() => {
    setPackingItems(trip.packingItems);
    packingItemsRef.current = trip.packingItems;
  }, [trip.packingItems]);

  const [activeDayId, setActiveDayId] = useState<string | null>(
    trip.days[0]?.id ?? null,
  );
  // When true, the planner map shows the whole trip (all days' stops)
  // instead of just the active day — toggled by the "Trip summary" tile.
  const [showAllDays, setShowAllDays] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"map" | "notes">("map");
  const [notesFocus, setNotesFocus] = useState<{
    stopId: string;
    request: number;
  } | null>(null);
  // The stop a user expanded in the day panel — the map recenters on it
  // and shows its activities as extra pins while it's selected.
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [copiedStop, setCopiedStop] = useState<StopPoint | null>(null);
  const pasteInFlightRef = useRef(false);
  const [tab, setTab] = useState<ViewKey>("overview");
  const [mobilePlannerPane, setMobilePlannerPane] = useState<
    "itinerary" | "map" | "notes"
  >("itinerary");
  const [fuelPrices] = useState<FuelCountryPrice[]>(initialFuelPrices);
  const discardedOptimisticStopIds = useRef(new Set<string>());

  const isOwner = trip.ownerId === currentUserId;
  const currentDay = days.find((d) => d.id === activeDayId) ?? days[0];
  const currentDayIndex = currentDay
    ? days.findIndex((d) => d.id === currentDay.id)
    : -1;
  const currentDayId = currentDay?.id;
  const currentStops = currentDay?.stops ?? [];
  const currentStay = stays.find((stay) => stay.afterDayId === currentDayId);
  const previousStay = stays.find(
    (stay) => stay.afterDayId === days[currentDayIndex - 1]?.id,
  );
  const deferredMapDays = useDeferredValue(days);
  const deferredCurrentStops = useMemo(
    () => deferredMapDays.find((day) => day.id === currentDayId)?.stops ?? [],
    [currentDayId, deferredMapDays],
  );
  const allStops = useMemo(
    () => deferredMapDays.flatMap((day) => day.stops),
    [deferredMapDays],
  );
  const selectedStopActivityPins = useMemo(
    () =>
      allStops
        .find((stop) => stop.id === selectedStopId)
        ?.activities.filter((a) => a.lat !== 0 || a.lng !== 0)
        .map((a) => ({
          id: a.id,
          lat: a.lat,
          lng: a.lng,
          title: a.title,
        })) ?? [],
    [allStops, selectedStopId],
  );
  const allStopColors = useMemo(
    () =>
      Object.fromEntries(
        deferredMapDays.flatMap((day) =>
          day.stops.flatMap((stop, index) =>
            stop.hasLocation
              ? [
                  [
                    stop.id,
                    stop.itemType === "activity"
                      ? "#7C5CBF"
                      : index === 0
                        ? "#16130D"
                        : "#E4562A",
                  ] as const,
                ]
              : [],
          ),
        ),
      ),
    [deferredMapDays],
  );
  const allMarkerLabels = useMemo(
    () =>
      Object.fromEntries(
        deferredMapDays.flatMap((day) =>
          day.stops.flatMap((stop, index) =>
            stop.hasLocation ? ([[stop.id, `${index + 1}`]] as const) : [],
          ),
        ),
      ),
    [deferredMapDays],
  );
  const currentStopColors = useMemo(
    () =>
      Object.fromEntries(
        deferredCurrentStops.flatMap((stop, index) =>
          stop.hasLocation
            ? [
                [
                  stop.id,
                  stop.itemType === "activity"
                    ? "#7C5CBF"
                    : index === 0
                      ? "#16130D"
                      : "#E4562A",
                ] as const,
              ]
            : [],
        ),
      ),
    [deferredCurrentStops],
  );
  const currentMarkerLabels = useMemo(
    () =>
      Object.fromEntries(
        deferredCurrentStops.flatMap((stop, index) =>
          stop.hasLocation ? ([[stop.id, `${index + 1}`]] as const) : [],
        ),
      ),
    [deferredCurrentStops],
  );

  // Route calculation and Leaflet redraws are substantially more expensive
  // than updating a control in the itinerary. Let the card render first and
  // update the map/metrics in a deferred render instead of blocking the click.
  const deferredRouteDays = deferredMapDays;
  const routeDays = useMemo(
    () =>
      deferredRouteDays.map((day, index) => {
        const previousStay = stays.find(
          (stay) => stay.afterDayId === deferredRouteDays[index - 1]?.id,
        );
        const stay = stays.find((item) => item.afterDayId === day.id);
        const nextDayFirstStop = deferredRouteDays[index + 1]?.stops[0];
        const points: StopPoint[] = [];

        if (
          previousStay?.stayType !== "driving_overnight" &&
          previousStay?.lat != null &&
          previousStay.lng != null
        ) {
          points.push(stayAsStop(previousStay, `stay-start-${day.id}`));
        }
        points.push(...inheritMissingLocations(day.stops, points.at(-1)));
        if (stay?.lat != null && stay.lng != null) {
          points.push(stayAsStop(stay, `stay-end-${day.id}`));
        } else if (stay?.stayType === "driving_overnight" && nextDayFirstStop) {
          points.push({ ...nextDayFirstStop, id: `overnight-end-${day.id}` });
        }

        return {
          ...day,
          stops: points,
          allRouteStops: points,
        };
      }),
    [deferredRouteDays, stays],
  );
  const wholeTripStops = useMemo(
    () =>
      deferredRouteDays.flatMap((day) => {
        const stay = stays.find((item) => item.afterDayId === day.id);
        const points = day.stops.filter((stop) => stop.hasLocation);
        if (
          stay?.stayType !== "driving_overnight" &&
          stay?.lat != null &&
          stay.lng != null
        ) {
          points.push(stayAsStop(stay, `stay-trip-${stay.id}`));
        }
        return points;
      }),
    [deferredRouteDays, stays],
  );
  const currentRouteDay = routeDays.find((day) => day.id === currentDayId);
  const currentRouteStops = drivingRouteStops(
    currentRouteDay?.stops ?? currentStops,
  );
  const allCurrentRouteStops = currentRouteDay?.allRouteStops ?? currentStops;
  const currentMapStops = useMemo(
    () =>
      routeStopsWithSelectedExcursion(
        allCurrentRouteStops.filter((stop) => stop.hasLocation),
        selectedStopId,
      ),
    [allCurrentRouteStops, selectedStopId],
  );
  const dayMetrics = useRouteMetrics(routeDays);

  // The trip's assigned vehicle (Trip.vehicleId) is the source of truth for
  // fuel math, so every collaborator sees the same numbers regardless of
  // their own vehicle list. Only the owner falls back to their own default
  // vehicle when the trip has none assigned yet — `vehicles` is always the
  // *viewer's* vehicles, which is meaningless for anyone but the owner.
  const selectedVehicle =
    trip.vehicle ??
    (isOwner
      ? (vehicles.find((v) => v.isDefault) ?? vehicles[0] ?? null)
      : null);

  const currentMetric = currentDayId ? dayMetrics[currentDayId] : undefined;
  const hasStartStayAnchor =
    previousStay?.stayType !== "driving_overnight" &&
    previousStay?.lat != null &&
    previousStay.lng != null;
  const hasEndStayAnchor =
    (currentStay?.lat != null && currentStay.lng != null) ||
    (currentStay?.stayType === "driving_overnight" &&
      Boolean(days[currentDayIndex + 1]?.stops[0]));
  const regularLegOffset = hasStartStayAnchor ? 1 : 0;
  const regularLegs = (currentMetric?.legs ?? []).slice(
    regularLegOffset,
    regularLegOffset + Math.max(0, currentStops.length - 1),
  );
  const startStayLeg = hasStartStayAnchor ? currentMetric?.legs[0] : undefined;
  const endStayLeg = hasEndStayAnchor
    ? currentMetric?.legs[regularLegOffset + currentStops.length - 1]
    : undefined;
  const { tripTotalKm, tripTotalMin } = useMemo(
    () => ({
      tripTotalKm: days.reduce(
        (sum, day) => sum + (dayMetrics[day.id]?.distanceKm ?? 0),
        0,
      ),
      tripTotalMin: days.reduce(
        (sum, day) => sum + (dayMetrics[day.id]?.driveMin ?? 0),
        0,
      ),
    }),
    [days, dayMetrics],
  );
  const tripFuelPln = estimateFuelCostPln(
    tripTotalKm,
    fuelPrices,
    selectedVehicle,
  );

  const fuelPlan = useMemo(() => {
    if (!selectedVehicle) return null;
    return buildFuelPlan(
      routeDays.map((d) => ({ id: d.id, stops: d.stops })),
      dayMetrics,
      selectedVehicle,
      fuelPrices,
    );
  }, [dayMetrics, fuelPrices, selectedVehicle, routeDays]);

  async function saveStay(input: TripStayInput) {
    const result = await saveTripStayAction(trip.id, input);
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    setStays((current) => [
      ...current.filter((stay) => stay.afterDayId !== input.afterDayId),
      result.data,
    ]);
    toast.success("Night plan saved.");
    return true;
  }

  async function createPackingItem(input: TripPackingItemInput) {
    const optimisticId = randomId();
    const optimisticItem = {
      id: optimisticId,
      name: input.name.trim(),
      category: input.category.trim(),
      acquisition: input.acquisition,
      quantity: input.quantity,
      notes: input.notes?.trim() || null,
      price: input.price ?? null,
      productLinks: input.productLinks,
      isPurchased: input.isPurchased,
      isPacked: input.isPacked,
      itemOrder:
        packingItems.reduce(
          (highest, item) => Math.max(highest, item.itemOrder),
          -1,
        ) + 1,
    };
    const withOptimisticItem = [...packingItemsRef.current, optimisticItem];
    packingItemsRef.current = withOptimisticItem;
    setPackingItems(withOptimisticItem);

    const result = await createTripPackingItemAction(trip.id, input);
    if (!result.success) {
      const rolledBack = packingItemsRef.current.filter(
        (item) => item.id !== optimisticId,
      );
      packingItemsRef.current = rolledBack;
      setPackingItems(rolledBack);
      toast.error(result.error);
      return false;
    }
    const confirmed = packingItemsRef.current.map((item) =>
      item.id === optimisticId ? result.data : item,
    );
    packingItemsRef.current = confirmed;
    setPackingItems(confirmed);
    toast.success("Added to packing list.");
    return true;
  }

  function updatePackingItem(
    itemId: string,
    input: TripPackingItemUpdateInput,
  ): Promise<boolean> {
    const currentItem = packingItemsRef.current.find(
      (item) => item.id === itemId,
    );
    if (!currentItem) return Promise.resolve(false);

    const optimisticItems = packingItemsRef.current.map((item) =>
      item.id === itemId ? { ...item, ...input } : item,
    );
    packingItemsRef.current = optimisticItems;
    setPackingItems(optimisticItems);

    return new Promise((resolve) => {
      const pending = pendingPackingUpdates.current.get(itemId);
      const before = pending?.before ?? {};
      for (const field of Object.keys(input)) {
        if (!(field in before)) {
          Object.assign(before, {
            [field]: currentItem[field as keyof TripPackingItemPlain],
          });
        }
      }
      if (pending) clearTimeout(pending.timer);

      const entry = {
        patch: { ...pending?.patch, ...input },
        before,
        resolvers: [...(pending?.resolvers ?? []), resolve],
        timer: setTimeout(() => {
          void flushPackingUpdate(itemId);
        }, 500),
      };
      pendingPackingUpdates.current.set(itemId, entry);
    });
  }

  async function flushPackingUpdate(itemId: string) {
    const pending = pendingPackingUpdates.current.get(itemId);
    if (!pending) return;
    pendingPackingUpdates.current.delete(itemId);

    const result = await updateTripPackingItemAction(itemId, pending.patch);
    const newerPending = pendingPackingUpdates.current.get(itemId);
    const settledFields = Object.keys(pending.patch).filter(
      (field) => !(field in (newerPending?.patch ?? {})),
    );
    if (!result.success) {
      const rolledBack = packingItemsRef.current.map((item) =>
        item.id === itemId
          ? mergePackingFields(item, pending.before, settledFields)
          : item,
      );
      packingItemsRef.current = rolledBack;
      setPackingItems(rolledBack);
      toast.error(result.error);
      pending.resolvers.forEach((resolve) => resolve(false));
      return;
    }

    const confirmed = packingItemsRef.current.map((item) =>
      item.id === itemId
        ? mergePackingFields(item, result.data, settledFields)
        : item,
    );
    packingItemsRef.current = confirmed;
    setPackingItems(confirmed);
    pending.resolvers.forEach((resolve) => resolve(true));
  }

  async function deletePackingItem(itemId: string) {
    const previous = packingItemsRef.current;
    const withoutItem = previous.filter((item) => item.id !== itemId);
    packingItemsRef.current = withoutItem;
    setPackingItems(withoutItem);
    const result = await deleteTripPackingItemAction(itemId);
    if (!result.success) {
      packingItemsRef.current = previous;
      setPackingItems(previous);
      toast.error(result.error);
      return false;
    }
    return true;
  }

  async function savePackingCategories(categories: PackingCategory[]) {
    const previousById = new Map(
      packingCategories.map((category) => [category.id, category.name]),
    );
    const result = await updateTripPackingCategoriesAction(trip.id, categories);
    if (!result.success) {
      toast.error(result.error);
      return false;
    }

    const renamed = new Map<string, string>();
    for (const category of result.data) {
      const previousName = previousById.get(category.id);
      if (previousName && previousName !== category.name) {
        renamed.set(previousName, category.name);
      }
    }
    const fallback =
      result.data.find((category) => category.name === "Other")?.name ??
      result.data[0].name;
    const validNames = new Set(result.data.map((category) => category.name));
    const nextItems = packingItemsRef.current.map((item) => ({
      ...item,
      category:
        renamed.get(item.category) ??
        (validNames.has(item.category) ? item.category : fallback),
    }));
    packingItemsRef.current = nextItems;
    setPackingItems(nextItems);
    setPackingCategories(result.data);
    toast.success("Categories updated.");
    return true;
  }

  async function importAiPackingList(
    importedItems: TripPackingItemInput[],
    newCategories: Array<{ name: string; color: string }>,
    replaceExisting: boolean,
    allowNewCategories: boolean,
  ) {
    const existingKeys = new Set(
      packingCategories.map((category) => category.name.toLocaleLowerCase()),
    );
    const additions = allowNewCategories
      ? newCategories
          .filter(
            (category) => !existingKeys.has(category.name.toLocaleLowerCase()),
          )
          .map((category) => ({
            id: randomId(),
            name: category.name,
            color: category.color,
          }))
      : [];
    const nextCategories = [...packingCategories, ...additions];
    if (nextCategories.length > 30) {
      toast.error("A trip can have at most 30 packing categories.");
      return false;
    }

    const result = await importAiPackingListAction(trip.id, {
      items: importedItems,
      categories: nextCategories,
      replaceExisting,
    });
    if (!result.success) {
      toast.error(result.error);
      return false;
    }

    const nextItems = replaceExisting
      ? [
          ...packingItemsRef.current.filter(
            (item) => item.acquisition === "buy",
          ),
          ...result.data.items,
        ]
      : [...packingItemsRef.current, ...result.data.items];
    packingItemsRef.current = nextItems;
    setPackingItems(nextItems);
    setPackingCategories(result.data.categories);
    toast.success(
      `Imported ${result.data.items.length} packing ${
        result.data.items.length === 1 ? "item" : "items"
      }.`,
    );
    return true;
  }

  async function removeStay(stayId?: string) {
    if (!stayId) return;
    const result = await deleteTripStayAction(trip.id, stayId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setStays((current) => current.filter((stay) => stay.id !== stayId));
    toast.success("Night plan removed.");
    router.refresh();
  }

  function enqueueDayWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = dayWriteQueueRef.current.then(operation, operation);
    dayWriteQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function addDay() {
    if (isAddingDay || isImportingTrip) return;
    setIsAddingDay(true);

    const previousDay = days[days.length - 1];
    const previousDayStay = stays.find(
      (stay) => stay.afterDayId === previousDay?.id,
    );
    const lastStop =
      previousDayStay?.stayType !== "driving_overnight" &&
      previousDayStay?.lat != null &&
      previousDayStay.lng != null
        ? undefined
        : previousDay?.stops[previousDay.stops.length - 1];
    const optimisticId = `optimistic-day-${randomId()}`;
    const optimisticDay: TripPlain["days"][number] = {
      id: optimisticId,
      dayNumber:
        days.reduce((highest, day) => Math.max(highest, day.dayNumber), 0) + 1,
      date: null,
      name: null,
      notes: null,
      startTime: null,
      stops: [],
    };

    // Paint the optimistic day before invoking the Server Action. Without a
    // synchronous flush React can batch both updates and keep the old UI on
    // screen until the network request has already started.
    flushSync(() => {
      setDays((current) => [...current, optimisticDay]);
      setActiveDayId(optimisticId);
    });

    const result = await enqueueDayWrite(() =>
      createTripDayAction(trip.id, {}),
    );
    if (!result.success) {
      setDays((current) => current.filter((day) => day.id !== optimisticId));
      setActiveDayId((current) =>
        current === optimisticId ? (previousDay?.id ?? null) : current,
      );
      toast.error(result.error);
      setIsAddingDay(false);
      return;
    }

    // `date` is always derived from trip.startDate + dayNumber at render
    // time (getDayDate) rather than stored per-day, so it's left null here.
    const nextDay: TripPlain["days"][number] = {
      id: result.data.id,
      dayNumber: result.data.dayNumber,
      date: null,
      name: result.data.name,
      notes: null,
      startTime: null,
      stops:
        lastStop && result.data.carryOverStopId
          ? [
              {
                id: result.data.carryOverStopId,
                name: lastStop.name,
                address: lastStop.address,
                lat: lastStop.lat,
                lng: lastStop.lng,
                hasLocation: lastStop.hasLocation,
                countryCode: lastStop.countryCode,
                itemType: "stop",
                travelMode: "driving",
                startTime: null,
                endTime: null,
                category: null,
                description: null,
                visitDurationMin: null,
                notes: null,
                activities: [],
              },
            ]
          : [],
    };

    setDays((current) =>
      current
        .map((day) => (day.id === optimisticId ? nextDay : day))
        .sort((a, b) => a.dayNumber - b.dayNumber),
    );
    setActiveDayId((current) =>
      current === optimisticId ? result.data.id : current,
    );

    setIsAddingDay(false);
    router.refresh();
  }

  function openDayInPlanner(dayId: string) {
    setActiveDayId(dayId);
    setShowAllDays(false);
    setSelectedStopId(null);
    setMobilePlannerPane("itinerary");
    setTab("planner");
  }

  const selectDay = useCallback((dayId: string) => {
    setActiveDayId(dayId);
    setShowAllDays(false);
    setSelectedStopId(null);
  }, []);

  function openNotesForStop(stopId: string) {
    setNotesFocus((current) => ({
      stopId,
      request: (current?.request ?? 0) + 1,
    }));
    setRightPanelMode("notes");
  }

  function selectStopForActivePanel(stopId: string) {
    if (rightPanelMode === "notes") {
      openNotesForStop(stopId);
      return;
    }
    setSelectedStopId(stopId);
  }

  const removeDay = useCallback(
    (dayId: string) => {
      if (isImportingTrip) return;
      if (!confirm("Delete this day and all its stops?")) return;

      const removedIndex = days.findIndex((day) => day.id === dayId);
      const removedDay = days[removedIndex];
      if (!removedDay || dayId.startsWith("optimistic-day-")) return;
      const removedStay = stays.find((stay) => stay.afterDayId === dayId);

      const previousActiveDayId = activeDayId;
      const nextDays = days
        .filter((day) => day.id !== dayId)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }));
      const nextActiveDayId =
        activeDayId === dayId
          ? (nextDays[Math.max(0, removedIndex - 1)]?.id ??
            nextDays[0]?.id ??
            null)
          : activeDayId;

      // Remove the day from the screen before any database work starts.
      flushSync(() => {
        setDays(nextDays);
        setStays((current) =>
          current.filter((stay) => stay.afterDayId !== dayId),
        );
        setActiveDayId(nextActiveDayId);
      });

      enqueueDayWrite(() => deleteTripDayAction(trip.id, dayId)).then(
        (result) => {
          if (!result.success) {
            setDays((current) => {
              if (current.some((day) => day.id === dayId)) return current;
              return [...current, removedDay]
                .sort((a, b) => a.dayNumber - b.dayNumber)
                .map((day, index) => ({ ...day, dayNumber: index + 1 }));
            });
            setActiveDayId((current) =>
              current === nextActiveDayId ? previousActiveDayId : current,
            );
            if (removedStay) {
              setStays((current) =>
                current.some((stay) => stay.id === removedStay.id)
                  ? current
                  : [...current, removedStay],
              );
            }
            toast.error(result.error);
            return;
          }

          const replacement = result.data.replacementDay;
          if (replacement) {
            setDays((current) => {
              if (current.some((day) => day.id === replacement.id)) {
                return current;
              }
              return [
                ...current,
                {
                  id: replacement.id,
                  dayNumber: replacement.dayNumber,
                  date: null,
                  name: replacement.name,
                  notes: null,
                  startTime: null,
                  stops: [],
                },
              ].sort((a, b) => a.dayNumber - b.dayNumber);
            });
          }
        },
      );
    },
    [isImportingTrip, days, stays, activeDayId, trip.id],
  );

  async function setDayStartTime(dayId: string, startTime: string) {
    const previousDays = days;
    setDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, startTime } : day)),
    );

    const result = await updateTripDayAction(trip.id, dayId, { startTime });
    if (!result.success) {
      setDays(previousDays);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function updateDayNotes(
    dayId: string,
    notes: string,
  ): Promise<boolean> {
    const previousDays = days;
    setDays((current) =>
      current.map((day) =>
        day.id === dayId ? { ...day, notes: notes.trim() || null } : day,
      ),
    );

    const result = await updateTripDayAction(trip.id, dayId, { notes });
    if (!result.success) {
      setDays(previousDays);
      toast.error(result.error);
      return false;
    }
    return true;
  }

  async function addStop(
    dayId: string,
    data: GeocodeResult,
    itemType: "stop" | "activity" = "stop",
    travelMode: "driving" | "walking" = "driving",
  ): Promise<string | null> {
    const optimisticId = `optimistic-stop-${randomId()}`;
    const optimisticStop: StopPoint = {
      id: optimisticId,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      hasLocation: true,
      countryCode: data.countryCode,
      itemType,
      travelMode,
      startTime: null,
      endTime: null,
      category: null,
      description: null,
      visitDurationMin: null,
      notes: null,
      activities: [],
    };

    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? { ...day, stops: [...day.stops, optimisticStop] }
          : day,
      ),
    );

    const result = await createTripStopAction(trip.id, dayId, {
      name: data.name,
      address: data.address,
      latitude: data.lat,
      longitude: data.lng,
      countryCode: data.countryCode,
      stopType: itemType,
      travelMode,
    });
    if (!result.success) {
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                stops: day.stops.filter((stop) => stop.id !== optimisticId),
              }
            : day,
        ),
      );
      toast.error(result.error);
      return null;
    }

    if (discardedOptimisticStopIds.current.has(optimisticId)) {
      discardedOptimisticStopIds.current.delete(optimisticId);
      void deleteTripStopAction(trip.id, result.data.id);
      return null;
    }

    setDays((current) =>
      current.map((day) => ({
        ...day,
        stops: day.stops.map((stop) =>
          stop.id === optimisticId ? { ...stop, id: result.data.id } : stop,
        ),
      })),
    );
    return result.data.id;
  }

  async function addManualActivity(
    dayId: string,
    name: string,
    visitDurationMin: number,
  ) {
    const optimisticId = `optimistic-stop-${randomId()}`;
    const optimisticActivity: StopPoint = {
      id: optimisticId,
      name: name.trim(),
      address: "",
      lat: 0,
      lng: 0,
      hasLocation: false,
      countryCode: null,
      itemType: "activity",
      travelMode: "walking",
      startTime: null,
      endTime: null,
      category: null,
      description: null,
      visitDurationMin,
      notes: null,
      activities: [],
    };
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? { ...day, stops: [...day.stops, optimisticActivity] }
          : day,
      ),
    );

    const result = await createTripStopAction(trip.id, dayId, {
      name: name.trim(),
      address: "",
      latitude: null,
      longitude: null,
      countryCode: null,
      stopType: "activity",
      travelMode: "walking",
      visitDurationMin,
    });
    if (!result.success) {
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                stops: day.stops.filter((stop) => stop.id !== optimisticId),
              }
            : day,
        ),
      );
      toast.error(result.error);
      return;
    }

    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              stops: day.stops.map((stop) =>
                stop.id === optimisticId
                  ? { ...stop, id: result.data.id }
                  : stop,
              ),
            }
          : day,
      ),
    );
  }

  function copyStop(stop: StopPoint) {
    setCopiedStop({
      ...stop,
      activities: stop.activities.map((activity) => ({ ...activity })),
    });
    toast.success(
      `${stop.itemType === "activity" ? "Activity" : "Stop"} copied.`,
    );
  }

  async function pasteCopiedStop(targetDayId: string): Promise<boolean> {
    if (!copiedStop || pasteInFlightRef.current) return false;

    pasteInFlightRef.current = true;
    const clipboardStop = copiedStop;
    setCopiedStop(null);
    const optimisticId = `optimistic-stop-${randomId()}`;
    const optimisticCopy: StopPoint = {
      ...clipboardStop,
      id: optimisticId,
      activities: clipboardStop.activities.map((activity) => ({
        ...activity,
        id: `optimistic-activity-${randomId()}`,
      })),
    };
    setDays((current) =>
      current.map((day) =>
        day.id === targetDayId
          ? { ...day, stops: [...day.stops, optimisticCopy] }
          : day,
      ),
    );

    let result: Awaited<ReturnType<typeof duplicateTripStopAction>>;
    try {
      result = await duplicateTripStopAction(
        trip.id,
        clipboardStop.id,
        targetDayId,
      );
    } catch (error) {
      console.error("Could not paste trip item", error);
      result = {
        success: false,
        error: "The paste request failed. Please try again.",
      };
    } finally {
      pasteInFlightRef.current = false;
    }

    if (!result.success) {
      setDays((current) =>
        current.map((day) =>
          day.id === targetDayId
            ? {
                ...day,
                stops: day.stops.filter((stop) => stop.id !== optimisticId),
              }
            : day,
        ),
      );
      setCopiedStop(clipboardStop);
      toast.error(result.error);
      return false;
    }

    setDays((current) =>
      current.map((day) =>
        day.id === targetDayId
          ? {
              ...day,
              stops: day.stops.map((stop) =>
                stop.id === optimisticId ? result.data : stop,
              ),
            }
          : day,
      ),
    );
    toast.success(
      `${clipboardStop.itemType === "activity" ? "Activity" : "Stop"} pasted.`,
    );
    return true;
  }

  async function importDayStops(
    dayId: string,
    importedItems: AiDayRouteItem[],
    replaceExisting: boolean,
    dayNotesMarkdown: string,
    dayStartTime: string,
  ): Promise<boolean> {
    const previousDay = days.find((day) => day.id === dayId);
    const previousStops = previousDay?.stops ?? [];
    const optimisticStops: StopPoint[] = importedItems.map(
      ({ place, itemType, travelMode, notesMarkdown, visitDurationMin }) => ({
        id: `optimistic-stop-${randomId()}`,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        hasLocation: true,
        countryCode: place.countryCode,
        itemType,
        travelMode,
        startTime: null,
        endTime: null,
        category: null,
        description: notesMarkdown || null,
        visitDurationMin,
        notes: null,
        activities: [],
      }),
    );

    flushSync(() => {
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                stops: replaceExisting
                  ? optimisticStops
                  : [...day.stops, ...optimisticStops],
                notes: dayNotesMarkdown || null,
                startTime: dayStartTime,
              }
            : day,
        ),
      );
    });

    const result = await importTripDayStopsAction(trip.id, dayId, {
      replaceExisting,
      dayNotesMarkdown,
      dayStartTime,
      items: importedItems.map(
        ({ place, itemType, travelMode, notesMarkdown, visitDurationMin }) => ({
          name: place.name,
          address: place.address,
          latitude: place.lat,
          longitude: place.lng,
          countryCode: place.countryCode,
          itemType,
          travelMode,
          description: notesMarkdown,
          visitDurationMin,
        }),
      ),
    });
    if (!result.success) {
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                stops: previousStops,
                notes: previousDay?.notes ?? null,
              }
            : day,
        ),
      );
      toast.error(result.error);
      return false;
    }

    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              stops: day.stops.map((stop) => {
                const optimisticIndex = optimisticStops.findIndex(
                  (item) => item.id === stop.id,
                );
                return optimisticIndex >= 0
                  ? { ...stop, id: result.data.ids[optimisticIndex] }
                  : stop;
              }),
            }
          : day,
      ),
    );
    return true;
  }

  async function importWholeTrip(
    importedDays: AiTripDay[],
    replaceExisting: boolean,
  ): Promise<boolean> {
    // Route every day create/delete through the same queue as addDay/removeDay
    // so a user clicking those while an import is in flight can't interleave
    // writes and desync dayNumber ordering. The button is also disabled below
    // (isImportingTrip) as the primary guard; this queue is the fallback.
    setIsImportingTrip(true);
    try {
      if (replaceExisting) {
        for (const day of days) {
          const deleted = await enqueueDayWrite(() =>
            deleteTripDayAction(trip.id, day.id),
          );
          if (!deleted.success) {
            toast.error(deleted.error);
            router.refresh();
            return false;
          }
        }
      }

      let firstCreatedDayId: string | null = null;
      for (const importedDay of importedDays) {
        const created = await enqueueDayWrite(() =>
          createTripDayAction(trip.id, {
            name: importedDay.name ?? "",
            startTime: importedDay.dayStartTime,
          }),
        );
        if (!created.success) {
          toast.error(created.error);
          router.refresh();
          return false;
        }
        firstCreatedDayId ??= created.data.id;

        const routeItems = importedDay.items.filter(
          (item) => item.type !== "overnight",
        );
        const stopsImported = await importTripDayStopsAction(
          trip.id,
          created.data.id,
          {
            replaceExisting: true,
            dayNotesMarkdown: importedDay.dayNotesMarkdown,
            dayStartTime: importedDay.dayStartTime,
            items: routeItems.map((item) => ({
              name: item.name,
              address: item.address,
              latitude: item.latitude,
              longitude: item.longitude,
              countryCode: item.countryCode,
              itemType: item.type,
              travelMode: item.travelMode,
              description: item.notesMarkdown,
              visitDurationMin: item.visitDurationMin,
            })),
          },
        );
        if (!stopsImported.success) {
          toast.error(stopsImported.error);
          router.refresh();
          return false;
        }

        const overnight = [...importedDay.items]
          .reverse()
          .find((item) => item.type === "overnight");
        if (overnight) {
          const stayType = overnight.stayType ?? "hotel";
          const isOvernightDrive = stayType === "driving_overnight";
          const staySaved = await saveTripStayAction(trip.id, {
            afterDayId: created.data.id,
            name: isOvernightDrive ? "Driving overnight" : overnight.name,
            stayType,
            status: "planned",
            address: isOvernightDrive ? "" : overnight.address,
            latitude: isOvernightDrive ? null : overnight.latitude,
            longitude: isOvernightDrive ? null : overnight.longitude,
            countryCode: isOvernightDrive ? null : overnight.countryCode,
            checkInTime: null,
            checkOutTime: null,
            price: null,
            currency: "PLN",
            notes:
              overnight.notesMarkdown || "AI-suggested overnight location.",
          });
          if (!staySaved.success) {
            toast.error(staySaved.error);
            router.refresh();
            return false;
          }
        }
      }

      if (firstCreatedDayId) setActiveDayId(firstCreatedDayId);
      toast.success("AI trip plan imported.");
      router.refresh();
      return true;
    } finally {
      setIsImportingTrip(false);
    }
  }

  async function updateStop(
    stopId: string,
    patch: Partial<StopPoint>,
  ): Promise<boolean> {
    if (stopId.startsWith("optimistic-stop-")) return false;

    const previousDays = days;
    const applyPatch = (stop: StopPoint) =>
      stop.id === stopId ? { ...stop, ...patch } : stop;
    setDays((current) =>
      current.map((day) => ({ ...day, stops: day.stops.map(applyPatch) })),
    );
    const result = await updateTripStopAction(trip.id, stopId, {
      name: patch.name,
      address: patch.address,
      latitude: patch.hasLocation === false ? null : patch.lat,
      longitude: patch.hasLocation === false ? null : patch.lng,
      countryCode: patch.countryCode,
      stopType: patch.itemType,
      travelMode: patch.travelMode,
      startTime: patch.startTime ?? undefined,
      endTime: patch.endTime ?? undefined,
      category: patch.category,
      description: patch.description,
      visitDurationMin: patch.visitDurationMin ?? undefined,
      notes: patch.notes ?? undefined,
    });
    if (!result.success) {
      setDays(previousDays);
      toast.error(result.error);
      return false;
    }
    return true;
  }

  async function updateStayNotes(
    stayId: string,
    notes: string,
  ): Promise<boolean> {
    const previousStays = stays;
    setStays((current) =>
      current.map((stay) =>
        stay.id === stayId ? { ...stay, notes: notes.trim() || null } : stay,
      ),
    );
    const result = await updateTripStayAction(trip.id, stayId, { notes });
    if (!result.success) {
      setStays(previousStays);
      toast.error(result.error);
      return false;
    }
    return true;
  }

  function removeStop(stopId: string) {
    // Optimistic: remove locally first so the UI settles immediately,
    // then persist in the background. Roll back only if the save fails.
    const previousDays = days;
    setDays((current) =>
      current.map((d) => ({
        ...d,
        stops: d.stops.filter((stop) => stop.id !== stopId),
      })),
    );
    if (stopId.startsWith("optimistic-stop-")) {
      discardedOptimisticStopIds.current.add(stopId);
      return;
    }

    deleteTripStopAction(trip.id, stopId).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function reorderStops(dayId: string, orderedStopIds: string[]) {
    // Keep the UI optimistic, but serialize writes for each day. Without the
    // queue, an older request can finish after a newer one and restore stale
    // stop_order values in the database.
    const version = (stopReorderVersionsRef.current.get(dayId) ?? 0) + 1;
    stopReorderVersionsRef.current.set(dayId, version);

    setDays((current) =>
      current.map((day) => {
        if (day.id !== dayId) return day;
        const byId = new Map(day.stops.map((s) => [s.id, s]));
        return {
          ...day,
          stops: orderedStopIds
            .map((id) => byId.get(id))
            .filter((s): s is StopPoint => s !== undefined),
        };
      }),
    );

    const persist = async () => {
      try {
        const result = await reorderTripStopsAction(trip.id, {
          dayId,
          stopIds: orderedStopIds,
        });
        if (result.success) return;
        if (stopReorderVersionsRef.current.get(dayId) === version) {
          toast.error(result.error);
          router.refresh();
        }
      } catch {
        if (stopReorderVersionsRef.current.get(dayId) === version) {
          toast.error("Could not save the new stop order.");
          router.refresh();
        }
      }
    };

    const previousQueue =
      stopReorderQueuesRef.current.get(dayId) ?? Promise.resolve();
    const nextQueue = previousQueue.then(persist, persist);
    stopReorderQueuesRef.current.set(dayId, nextQueue);
    void nextQueue.finally(() => {
      if (stopReorderQueuesRef.current.get(dayId) === nextQueue) {
        stopReorderQueuesRef.current.delete(dayId);
      }
    });
  }

  function reorderDays(orderedDayIds: string[]) {
    const previousDays = days;
    setDays((current) => {
      const byId = new Map(current.map((d) => [d.id, d]));
      return orderedDayIds
        .map((id) => byId.get(id))
        .filter((d): d is TripPlain["days"][number] => d !== undefined);
    });

    reorderTripDaysAction(trip.id, { dayIds: orderedDayIds }).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const moveDay = useCallback(
    (index: number, direction: -1 | 1) => {
      const destination = index + direction;
      if (destination < 0 || destination >= days.length) return;
      const reordered = [...days];
      const [movedDay] = reordered.splice(index, 1);
      reordered.splice(destination, 0, movedDay);
      reorderDays(reordered.map((day) => day.id));
    },
    // reorderDays is redefined every render from the same `days` this
    // callback already depends on, so it's always in sync with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days],
  );

  const moveDayUp = useCallback(
    (index: number) => moveDay(index, -1),
    [moveDay],
  );
  const moveDayDown = useCallback(
    (index: number) => moveDay(index, 1),
    [moveDay],
  );

  async function handleSaveTrip(patch: TripUpdateInput) {
    const result = await updateTripAction(trip.id, patch);
    if (!result.success) throw new Error(result.error);
    router.refresh();
  }

  async function handleDeleteTrip() {
    if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
    const result = await deleteTripAction(trip.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex h-dvh w-full max-w-full overflow-x-hidden bg-[#EEE8DC] text-foreground">
      {tab !== "landing" && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[1100] h-[env(safe-area-inset-top)] bg-[#FBF8F1] md:hidden"
        />
      )}
      {tab !== "landing" && (
        <CollapsedSidebar
          userFullName={currentUserFullName}
          userEmail={currentUserEmail}
          userAvatarUrl={currentUserAvatarUrl}
          onLogoClick={() => setTab("landing")}
          onProfileClick={() => router.push("/profile")}
          trips={trips.map((item) => ({
            id: item.id,
            name: item.name,
            heroImageUrl: item.heroImageUrl,
          }))}
          activeTripId={trip.id}
        />
      )}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {tab === "landing" && (
          <HomeScreen
            onOpenOverview={() => setTab("overview")}
            onOpenPlanner={() => setTab("planner")}
          />
        )}

        {tab === "overview" && (
          <OverviewView
            trip={trip}
            days={days}
            stays={stays}
            currentUserId={currentUserId}
            vehicles={vehicles}
            tripTotalKm={tripTotalKm}
            tripTotalMin={tripTotalMin}
            fuelPlan={fuelPlan}
            fuelVehicle={selectedVehicle}
            onSaveTrip={handleSaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onSelectDay={openDayInPlanner}
            onLogoClick={() => setTab("landing")}
          />
        )}

        {tab === "planner" && (
          <div
            className={`flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-0 overflow-x-hidden bg-[#FFFAF0] lg:grid lg:bg-none ${
              showAllDays
                ? "lg:grid-cols-[280px_1fr]"
                : "lg:grid-cols-[280px_minmax(420px,460px)_1fr]"
            }`}
          >
            <div className="relative z-20 flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden border-[#E4DBC8] bg-[#FBF8F1] shadow-[0_12px_28px_-22px_rgba(22,19,13,0.75)] lg:z-auto lg:border-r lg:shadow-none">
              <header className="relative z-10 flex min-h-[calc(76px+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 bg-transparent pb-2.5 pl-4 pr-[156px] pt-[calc(0.875rem+env(safe-area-inset-top))] lg:min-h-[70px] lg:border-b lg:border-[#E4DBC8]/90 lg:bg-[#FBF8F1]/95 lg:px-3.5 lg:py-3 lg:shadow-[0_10px_24px_-18px_rgba(22,19,13,0.75)] lg:backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTab("landing")}
                    className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-brand shadow-[0_8px_20px_rgba(228,86,42,0.22)] lg:hidden"
                    title="Open home"
                    aria-label="Open home"
                  >
                    <LogoMark className="size-7" />
                  </button>
                  <span className="hidden size-9 shrink-0 place-items-center rounded-[12px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.24)] lg:grid">
                    <MapPinned className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-black leading-tight tracking-[-0.015em] text-foreground lg:text-[15px] lg:tracking-normal">
                      Planner
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[#8A7A68] lg:text-[10px] lg:font-bold lg:uppercase lg:tracking-[0.1em] lg:text-muted-foreground">
                      <span className="lg:hidden">{trip.name} · </span>
                      {days.length} {days.length === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-1.5 lg:flex">
                  <button
                    type="button"
                    onClick={() => setTripAiOpen(true)}
                    className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-[#D8CEB8] bg-[#F3EFE4] text-[#8A5F4D] transition-colors hover:border-[#E4562A]/40 hover:bg-[#FBE7DD] hover:text-[#C6532D] lg:size-[34px] lg:rounded-[10px]"
                    title="Export whole trip for AI"
                    aria-label="Export whole trip for AI"
                  >
                    <Sparkles className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={addDay}
                    disabled={isAddingDay || isImportingTrip}
                    className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.2)] transition-colors hover:bg-[#cf4822] disabled:cursor-default disabled:opacity-60 lg:size-[34px] lg:rounded-[10px]"
                    title="Add day"
                    aria-label="Add day"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </header>
              <div className="order-1 mx-4 grid shrink-0 grid-cols-3 rounded-[12px] border border-white/50 bg-[#E9E2D5]/90 p-1 shadow-sm backdrop-blur lg:hidden">
                {(
                  [
                    ["itinerary", "Itinerary", RouteIcon],
                    ["map", "Map", MapIcon],
                    ["notes", "Notes", NotebookText],
                  ] as const
                ).map(([pane, label, Icon]) => (
                  <button
                    key={pane}
                    type="button"
                    onClick={() => {
                      setMobilePlannerPane(pane);
                      if (pane !== "itinerary") setRightPanelMode(pane);
                    }}
                    className={cn(
                      "inline-flex h-8 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[11px] font-bold transition-all",
                      mobilePlannerPane === pane
                        ? "bg-white text-[#16130D] shadow-sm"
                        : "text-[#8A8270]",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="order-2 flex min-h-0 flex-none snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-4 pt-3 lg:order-none lg:block lg:flex-1 lg:snap-none lg:space-y-2 lg:overflow-x-hidden lg:overflow-y-auto lg:px-3 lg:pb-3 lg:pt-3.5">
                {days.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No days yet.
                  </p>
                ) : (
                  days.map((day, i) => {
                    const metric = dayMetrics[day.id];
                    const stops = day.stops;
                    const routeDay = routeDays.find(
                      (item) => item.id === day.id,
                    );
                    const routeStops =
                      stops.length > 0 ? (routeDay?.stops ?? stops) : [];
                    const dayDate = getDayDate(i, trip.startDate);
                    const dateLabel = formatDayDateLabel(dayDate);
                    return (
                      <DayListCard
                        key={day.id}
                        dayId={day.id}
                        dateLabel={dateLabel}
                        weekdayLabel={formatWeekdayLabel(dayDate)}
                        index={i}
                        isLast={i === days.length - 1}
                        distanceKm={metric?.distanceKm ?? 0}
                        driveMin={metric?.driveMin ?? 0}
                        firstStopName={routeStops[0]?.name}
                        lastStopName={routeStops[routeStops.length - 1]?.name}
                        routePointCount={routeStops.length}
                        isEmpty={
                          stops.length === 0 &&
                          !stays.some((stay) => stay.afterDayId === day.id)
                        }
                        active={!showAllDays && day.id === currentDayId}
                        onSelect={selectDay}
                        onRemove={removeDay}
                        onMoveUp={moveDayUp}
                        onMoveDown={moveDayDown}
                      />
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => setTripAiOpen(true)}
                  className="flex h-[76px] w-[62px] shrink-0 snap-start flex-col items-center justify-center rounded-[13px] border border-[#DED3C0] bg-[#FAF6EE] px-1 text-center text-[#8A5F4D] shadow-[0_4px_12px_rgba(22,19,13,0.05)] sm:w-[68px] lg:hidden"
                  title="Open AI trip planner"
                  aria-label="Open AI trip planner"
                >
                  <span className="grid size-7 place-items-center rounded-[9px] bg-[#F3E5DA]">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="mt-1.5 text-[9px] font-black leading-tight">
                    AI plan
                  </span>
                </button>
                <button
                  type="button"
                  onClick={addDay}
                  disabled={isAddingDay || isImportingTrip}
                  className="flex h-[76px] w-[62px] shrink-0 snap-start flex-col items-center justify-center rounded-[13px] border border-[#E7A58F] bg-[#FBE7DD] px-1 text-center text-brand shadow-[0_4px_12px_rgba(228,86,42,0.08)] disabled:opacity-45 sm:w-[68px] lg:hidden"
                  title="Add day"
                  aria-label="Add day"
                >
                  <span className="grid size-7 place-items-center rounded-[9px] bg-brand text-brand-foreground">
                    <Plus className="size-4" />
                  </span>
                  <span className="mt-1.5 text-[9px] font-black leading-tight">
                    Add day
                  </span>
                </button>
                <TripSummaryCard
                  dayCount={days.length}
                  active={showAllDays}
                  onSelect={() => {
                    setShowAllDays(true);
                    setSelectedStopId(null);
                    setMobilePlannerPane("map");
                    setRightPanelMode("map");
                  }}
                />
              </div>
            </div>

            {!showAllDays && (
              <main
                className={cn(
                  "h-full min-h-0 min-w-0 max-w-full flex-1 overflow-hidden bg-transparent lg:block lg:border-r lg:border-[#E4DBC8] lg:bg-[#FFFAF0]",
                  mobilePlannerPane === "itinerary" ? "block" : "hidden",
                )}
              >
                {currentDay ? (
                  <DayPanel
                    key={currentDay.id}
                    day={currentDay}
                    index={currentDayIndex}
                    isLastDay={currentDayIndex === days.length - 1}
                    dateLabel={formatDayDateLabel(
                      getDayDate(currentDayIndex, trip.startDate),
                    )}
                    stops={currentStops}
                    legs={regularLegs}
                    startLeg={startStayLeg}
                    endLeg={endStayLeg}
                    onAddStop={(result, itemType) =>
                      void addStop(currentDay.id, result, itemType)
                    }
                    onAddManualActivity={(name, visitDurationMin) =>
                      void addManualActivity(
                        currentDay.id,
                        name,
                        visitDurationMin,
                      )
                    }
                    onImportStops={(
                      results,
                      replaceExisting,
                      dayNotesMarkdown,
                      dayStartTime,
                    ) =>
                      importDayStops(
                        currentDay.id,
                        results,
                        replaceExisting,
                        dayNotesMarkdown,
                        dayStartTime,
                      )
                    }
                    onUpdateStop={updateStop}
                    onRemoveStop={removeStop}
                    onReorderStops={(ids) => reorderStops(currentDay.id, ids)}
                    copiedItemName={copiedStop?.name}
                    onCopyStop={copyStop}
                    onPasteCopiedStop={() => pasteCopiedStop(currentDay.id)}
                    onSetDayStartTime={(startTime) =>
                      setDayStartTime(currentDay.id, startTime)
                    }
                    onLaunchNav={() => openInGoogleMaps(currentRouteStops)}
                    onOpenStopNotes={openNotesForStop}
                    onSelectStop={selectStopForActivePanel}
                    stay={currentStay}
                    previousStay={previousStay}
                    showStay={
                      Boolean(currentStay) ||
                      !(
                        trip.dayCount !== null &&
                        currentDayIndex === trip.dayCount - 1 &&
                        currentStops.length > 0
                      )
                    }
                    onSaveStay={saveStay}
                    onDeleteStay={() => removeStay(currentStay?.id)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No days yet.
                    </p>
                    <button
                      onClick={addDay}
                      disabled={isAddingDay || isImportingTrip}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground hover:bg-brand/90 disabled:cursor-default"
                    >
                      Add first day
                    </button>
                  </div>
                )}
              </main>
            )}

            <section
              className={cn(
                "relative min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden lg:min-h-[400px] lg:flex",
                mobilePlannerPane !== "itinerary" || showAllDays
                  ? "flex"
                  : "hidden",
                rightPanelMode === "notes" ? "bg-[#F8F5ED]" : "bg-[#EEEAE1]",
              )}
            >
              <div className="absolute left-1/2 top-3 z-[500] hidden -translate-x-1/2 grid-cols-2 rounded-[12px] border border-white/50 bg-[#E9E2D5]/90 p-1 shadow-sm backdrop-blur lg:grid">
                {(
                  [
                    ["map", "Map", MapIcon],
                    ["notes", "Notes", NotebookText],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRightPanelMode(value)}
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[9px] px-4 text-xs font-bold transition ${
                      rightPanelMode === value
                        ? "bg-white text-[#16130D] shadow-sm"
                        : "text-[#8A8270] hover:text-[#5F594D]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-h-0 flex-1">
                {rightPanelMode === "notes" ? (
                  <div className="h-full lg:pt-[58px]">
                    <RouteNotesPanel
                      days={showAllDays ? days : currentDay ? [currentDay] : []}
                      stays={stays}
                      focusEntryId={notesFocus?.stopId}
                      focusRequest={notesFocus?.request}
                      showDayHeadings={showAllDays}
                      onUpdateDayNotes={updateDayNotes}
                      onUpdateStopNotes={(stopId, notes) =>
                        updateStop(stopId, { description: notes })
                      }
                      onUpdateStayNotes={updateStayNotes}
                    />
                  </div>
                ) : showAllDays ? (
                  <MapView
                    stops={wholeTripStops}
                    viewportKey={`trip-${trip.id}`}
                    stopColors={allStopColors}
                    markerLabels={allMarkerLabels}
                    activeStopId={selectedStopId ?? undefined}
                    activityPins={selectedStopActivityPins}
                  />
                ) : (
                  <MapView
                    stops={currentMapStops}
                    viewportKey={`day-${currentDayId ?? "empty"}`}
                    stopColors={currentStopColors}
                    markerLabels={currentMarkerLabels}
                    activeStopId={selectedStopId ?? undefined}
                    activityPins={selectedStopActivityPins}
                  />
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "fuel" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FuelDashboard
              stays={stays}
              packingItems={packingItems}
              packingCategories={packingCategories}
              onCreatePackingItem={createPackingItem}
              onUpdatePackingItem={updatePackingItem}
              onDeletePackingItem={deletePackingItem}
              onUpdatePackingCategories={savePackingCategories}
              onSaveStay={saveStay}
              onDeleteStay={removeStay}
              tripName={trip.name}
              dayCount={days.length}
              onLogoClick={() => setTab("landing")}
              tripContext={buildPackingTripContext(
                {
                  ...trip,
                  days,
                  stays,
                  packingItems,
                  packingCategories,
                },
                {
                  totalKm: tripTotalKm,
                  totalMin: tripTotalMin,
                },
              )}
              onAiPackingImport={importAiPackingList}
            />
          </div>
        )}

        <AiTripImportDialog
          trip={{ ...trip, days, stays }}
          totalKm={tripTotalKm}
          totalMin={tripTotalMin}
          fuelPln={tripFuelPln}
          open={tripAiOpen}
          onOpenChange={setTripAiOpen}
          onImport={importWholeTrip}
        />

        {tab !== "landing" && (
          <FloatingTripNav
            activeTab={tab}
            currentTrip={trip}
            trips={trips}
            onSelectTab={setTab}
          />
        )}
      </div>
    </div>
  );
}

function FloatingTripNav({
  activeTab,
  currentTrip,
  trips,
  onSelectTab,
}: {
  activeTab: ViewKey;
  currentTrip: TripPlain;
  trips: TripSwitcherItem[];
  onSelectTab: (tab: ViewKey) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const sortedTrips = useMemo(
    () => [
      ...trips.filter((item) => item.id === currentTrip.id),
      ...trips.filter((item) => item.id !== currentTrip.id),
    ],
    [currentTrip.id, trips],
  );

  return (
    <>
      <div
        ref={switcherRef}
        className="fixed bottom-3 left-1/2 z-[9999] w-auto max-w-[calc(100vw-24px)] -translate-x-1/2 sm:bottom-5 sm:max-w-[calc(100vw-32px)]"
      >
        {open && (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-border bg-card/98 shadow-[0_18px_50px_rgba(22,19,13,0.24)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Your trips
                </p>
                <p className="text-sm font-black text-foreground">
                  Switch roadtrip
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="grid size-9 place-items-center rounded-full bg-brand text-brand-foreground shadow-[0_10px_22px_rgba(228,86,42,0.24)] transition-colors hover:bg-[#cf4822]"
                aria-label="Create new trip"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="max-h-[310px] overflow-y-auto p-2">
              {sortedTrips.map((item) => {
                const active = item.id === currentTrip.id;
                return (
                  <Link
                    key={item.id}
                    href={`/trips/${item.id}`}
                    prefetch={false}
                    onMouseEnter={() =>
                      !active && router.prefetch(`/trips/${item.id}`)
                    }
                    onFocus={() =>
                      !active && router.prefetch(`/trips/${item.id}`)
                    }
                    onClick={(event) => {
                      setOpen(false);
                      if (active) event.preventDefault();
                    }}
                    className={
                      "grid w-full grid-cols-[48px_minmax(0,1fr)_22px] items-center gap-3 rounded-[18px] px-2 py-2 text-left transition-colors " +
                      (active ? "bg-[#fff4e4]" : "hover:bg-[#fffaf0]")
                    }
                  >
                    <span className="grid size-12 place-items-center overflow-hidden rounded-[16px] bg-muted text-brand">
                      {item.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.heroImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <RouteIcon className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-foreground">
                        {item.name}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Calendar className="size-3.5 text-brand" />
                        {tripMetaLabel(item)}
                      </span>
                    </span>
                    {active && <Check className="size-4 text-brand" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <nav className="flex w-auto items-center justify-center gap-0.5 overflow-hidden rounded-full border border-border bg-card/95 p-1.5 shadow-[0_16px_42px_rgba(22,19,13,0.22)] backdrop-blur-md sm:justify-start sm:gap-1 sm:overflow-x-auto sm:p-2">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex min-w-0 shrink-0 items-center gap-0.5 rounded-full px-2.5 py-2 text-sm font-black text-foreground transition-colors hover:bg-muted sm:max-w-[210px] sm:gap-2 sm:px-4"
            aria-expanded={open}
          >
            <RouteIcon className="size-4 shrink-0 text-brand" />
            <span className="hidden truncate sm:inline">
              {currentTrip.name}
            </span>
            <ChevronDown
              className={
                "size-4 shrink-0 text-brand transition-transform " +
                (open ? "rotate-180" : "")
              }
            />
          </button>

          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
            const Icon = TAB_ICONS[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTab(key)}
                className={
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-2 text-sm transition-colors sm:px-5 " +
                  (activeTab === key
                    ? "bg-brand font-black text-brand-foreground shadow-[0_10px_22px_rgba(228,86,42,0.24)]"
                    : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <Icon
                  className={
                    "size-4 shrink-0 " +
                    (activeTab === key ? "text-brand-foreground" : "text-brand")
                  }
                />
                <span className="hidden sm:inline">{TAB_LABELS[key]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <NewTripDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function tripMetaLabel(trip: TripSwitcherItem) {
  const pieces = [];
  if (trip.startDate) pieces.push(formatDayDateLabel(trip.startDate));
  pieces.push(`${trip.dayCount || 0} ${trip.dayCount === 1 ? "day" : "days"}`);
  return pieces.filter(Boolean).join(" · ");
}

function mergePackingFields(
  target: TripPackingItemPlain,
  source: Partial<TripPackingItemPlain>,
  fields: string[],
) {
  const merged = { ...target };
  for (const field of fields) {
    if (field in source) {
      Object.assign(merged, {
        [field]: source[field as keyof TripPackingItemPlain],
      });
    }
  }
  return merged;
}
