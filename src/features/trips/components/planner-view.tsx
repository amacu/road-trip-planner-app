"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Fuel,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  MapPinned,
  NotebookText,
  Plus,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { FuelDashboard } from "@/features/fuel/components/fuel-dashboard";
import { HomeScreen } from "@/features/home/components/home-screen";
import {
  createTripPackingItemAction,
  deleteTripPackingItemAction,
  updateTripPackingCategoriesAction,
  updateTripPackingItemAction,
} from "@/features/trip-packing/actions";
import {
  buildFuelPlan,
  estimateFuelCostPln,
} from "@/features/fuel/lib/fuel-plan";
import {
  createTripActivityAction,
  deleteTripActivityAction,
  reorderTripActivitiesAction,
  updateTripActivityAction,
} from "@/features/trip-activities/actions";
import {
  createTripDayAction,
  deleteTripDayAction,
  reorderTripDaysAction,
  updateTripDayAction,
} from "@/features/trip-days/actions";
import {
  DayPanel,
  type AiDayRouteItem,
} from "@/features/trip-days/components/day-panel";
import { RouteNotesPanel } from "@/features/trip-days/components/route-notes-panel";
import {
  deleteTripStayAction,
  saveTripStayAction,
  updateTripStayAction,
} from "@/features/trip-stays/actions";
import {
  createTripStopAction,
  deleteTripStopAction,
  importTripDayStopsAction,
  reorderTripStopsAction,
  updateTripStopAction,
} from "@/features/trip-stops/actions";
import { MapView } from "@/features/trip-stops/components/map-view";
import { DayListCard } from "@/features/trips/components/day-list-card";
import {
  AiTripImportDialog,
  type AiTripDay,
} from "@/features/trips/components/ai-trip-import-dialog";
import { NewTripDialog } from "@/features/trips/components/new-trip-dialog";
import { OverviewView } from "@/features/trips/components/overview-view";
import { TripSummaryCard } from "@/features/trips/components/trip-summary-card";
import { deleteTripAction, updateTripAction } from "@/features/trips/actions";
import type {
  StopPoint,
  TripActivityPlain,
  TripPackingItemPlain,
  TripPlain,
  TripStayPlain,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import { useRouteMetrics } from "@/features/trips/hooks/use-route-metrics";
import { formatDistance, formatDuration } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode-client";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import type { FuelCountryPrice } from "@/lib/integrations/fuel-prices";
import { openInGoogleMaps } from "@/lib/integrations/google-maps";
import type { TripUpdateInput } from "@/lib/validators/trip";
import type { TripStayInput } from "@/lib/validators/trip-stay";
import type {
  PackingCategory,
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";
import { randomId } from "@/lib/utils";

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

function stayAsStop(stay: TripStayPlain, id: string): StopPoint {
  return {
    id,
    name: stay.name,
    address: stay.address,
    lat: stay.lat ?? 0,
    lng: stay.lng ?? 0,
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
  const [tab, setTab] = useState<ViewKey>("overview");
  const [fuelPrices] = useState<FuelCountryPrice[]>(initialFuelPrices);
  const discardedOptimisticStopIds = useRef(new Set<string>());
  const discardedOptimisticActivityIds = useRef(new Set<string>());

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
          day.stops.map((stop, index) => [
            stop.id,
            stop.itemType === "activity"
              ? "#7C5CBF"
              : index === 0
                ? "#16130D"
                : "#E4562A",
          ]),
        ),
      ),
    [deferredMapDays],
  );
  const allMarkerLabels = useMemo(
    () =>
      Object.fromEntries(
        deferredMapDays.flatMap((day) =>
          day.stops.map((stop, index) => [stop.id, `${index + 1}`]),
        ),
      ),
    [deferredMapDays],
  );
  const currentStopColors = useMemo(
    () =>
      Object.fromEntries(
        deferredCurrentStops.map((stop, index) => [
          stop.id,
          stop.itemType === "activity"
            ? "#7C5CBF"
            : index === 0
              ? "#16130D"
              : "#E4562A",
        ]),
      ),
    [deferredCurrentStops],
  );
  const currentMarkerLabels = useMemo(
    () =>
      Object.fromEntries(
        deferredCurrentStops.map((stop, index) => [stop.id, `${index + 1}`]),
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
        points.push(...day.stops);
        if (stay?.lat != null && stay.lng != null) {
          points.push(stayAsStop(stay, `stay-end-${day.id}`));
        } else if (stay?.stayType === "driving_overnight" && nextDayFirstStop) {
          points.push({ ...nextDayFirstStop, id: `overnight-end-${day.id}` });
        }

        return {
          ...day,
          stops: drivingRouteStops(points),
          allRouteStops: points,
        };
      }),
    [deferredRouteDays, stays],
  );
  const currentRouteDay = routeDays.find((day) => day.id === currentDayId);
  const currentRouteStops = currentRouteDay?.stops ?? currentStops;
  const allCurrentRouteStops = currentRouteDay?.allRouteStops ?? currentStops;
  const currentMapStops = useMemo(
    () => routeStopsWithSelectedExcursion(allCurrentRouteStops, selectedStopId),
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
  const distanceKm = currentMetric?.distanceKm ?? 0;
  const driveMin = currentMetric?.driveMin ?? 0;
  const fuelPln = estimateFuelCostPln(distanceKm, fuelPrices, selectedVehicle);

  const tripTotalKm = days.reduce(
    (sum, day) => sum + (dayMetrics[day.id]?.distanceKm ?? 0),
    0,
  );
  const tripTotalMin = days.reduce(
    (sum, day) => sum + (dayMetrics[day.id]?.driveMin ?? 0),
    0,
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
    router.refresh();
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

    const result = await updateTripPackingItemAction(
      trip.id,
      itemId,
      pending.patch,
    );
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
    const result = await deleteTripPackingItemAction(trip.id, itemId);
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
  }

  function openDayInPlanner(dayId: string) {
    setActiveDayId(dayId);
    setShowAllDays(false);
    setSelectedStopId(null);
    setTab("planner");
  }

  function selectDay(dayId: string) {
    setActiveDayId(dayId);
    setShowAllDays(false);
    setSelectedStopId(null);
  }

  function openNotesForStop(stopId: string) {
    setNotesFocus((current) => ({
      stopId,
      request: (current?.request ?? 0) + 1,
    }));
    setRightPanelMode("notes");
  }

  function removeDay(dayId: string) {
    if (isImportingTrip) return;
    if (!confirm("Delete this day and all its stops?")) return;

    const removedIndex = days.findIndex((day) => day.id === dayId);
    const removedDay = days[removedIndex];
    if (!removedDay || dayId.startsWith("optimistic-day-")) return;

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
          toast.error(result.error);
        }
      },
    );
  }

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
      latitude: patch.lat,
      longitude: patch.lng,
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

  function addActivity(stopId: string, place: GeocodeResult) {
    const previousDays = days;
    const optimisticId = `optimistic-activity-${randomId()}`;
    const optimisticActivity: TripActivityPlain = {
      id: optimisticId,
      title: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      googleMapsUrl: null,
      placeId: null,
      description: null,
      startTime: null,
      endTime: null,
      category: "sightseeing",
    };

    const appendActivity = (stop: StopPoint) =>
      stop.id === stopId
        ? { ...stop, activities: [...stop.activities, optimisticActivity] }
        : stop;

    setDays((current) =>
      current.map((day) => ({
        ...day,
        stops: day.stops.map(appendActivity),
      })),
    );
    createTripActivityAction(trip.id, stopId, {
      title: place.name,
      address: place.address,
      latitude: place.lat,
      longitude: place.lng,
      category: "sightseeing",
    }).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }

      if (discardedOptimisticActivityIds.current.has(optimisticId)) {
        discardedOptimisticActivityIds.current.delete(optimisticId);
        deleteTripActivityAction(trip.id, result.data.id);
        return;
      }

      const resolveActivity = (stop: StopPoint) => ({
        ...stop,
        activities: stop.activities.map((activity) =>
          activity.id === optimisticId
            ? { ...activity, id: result.data.id, title: result.data.title }
            : activity,
        ),
      });

      setDays((current) =>
        current.map((day) => ({
          ...day,
          stops: day.stops.map(resolveActivity),
        })),
      );
    });
  }

  async function updateActivity(
    activityId: string,
    patch: Partial<TripActivityPlain>,
  ) {
    if (activityId.startsWith("optimistic-activity-")) {
      const patchActivity = (stop: StopPoint) => ({
        ...stop,
        activities: stop.activities.map((activity) =>
          activity.id === activityId ? { ...activity, ...patch } : activity,
        ),
      });

      setDays((current) =>
        current.map((day) => ({
          ...day,
          stops: day.stops.map(patchActivity),
        })),
      );
      return;
    }

    const result = await updateTripActivityAction(trip.id, activityId, patch);
    if (!result.success) toast.error(result.error);
  }

  function removeActivity(activityId: string) {
    const previousDays = days;

    const dropActivity = (stop: StopPoint) => ({
      ...stop,
      activities: stop.activities.filter(
        (activity) => activity.id !== activityId,
      ),
    });

    setDays((current) =>
      current.map((day) => ({
        ...day,
        stops: day.stops.map(dropActivity),
      })),
    );
    if (activityId.startsWith("optimistic-activity-")) {
      discardedOptimisticActivityIds.current.add(activityId);
      return;
    }

    deleteTripActivityAction(trip.id, activityId).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }
    });
  }

  function reorderActivities(stopId: string, orderedActivityIds: string[]) {
    const previousDays = days;

    const applyOrder = (stop: StopPoint) => {
      if (stop.id !== stopId) return stop;
      const byId = new Map(stop.activities.map((a) => [a.id, a]));
      return {
        ...stop,
        activities: orderedActivityIds
          .map((id) => byId.get(id))
          .filter(
            (activity): activity is TripActivityPlain => activity !== undefined,
          ),
      };
    };

    setDays((current) =>
      current.map((day) => ({
        ...day,
        stops: day.stops.map(applyOrder),
      })),
    );
    if (
      orderedActivityIds.some((id) => id.startsWith("optimistic-activity-"))
    ) {
      return;
    }

    reorderTripActivitiesAction(trip.id, {
      stopId,
      activityIds: orderedActivityIds,
    }).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }
    });
  }

  function reorderStops(dayId: string, orderedStopIds: string[]) {
    // Optimistic: reorder locally first so the UI settles immediately,
    // then persist in the background. Roll back only if the save fails.
    const previousDays = days;
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

    reorderTripStopsAction(trip.id, { dayId, stopIds: orderedStopIds }).then(
      (result) => {
        if (!result.success) {
          setDays(previousDays);
          toast.error(result.error);
          return;
        }
        router.refresh();
      },
    );
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

  function moveDay(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= days.length) return;
    const reordered = [...days];
    const [movedDay] = reordered.splice(index, 1);
    reordered.splice(destination, 0, movedDay);
    reorderDays(reordered.map((day) => day.id));
  }

  async function handleAddPoi(poi: { name: string; lat: number; lng: number }) {
    if (!currentDay) return;
    const place = await reverseGeocode(poi.lat, poi.lng);
    addStop(currentDay.id, {
      name: poi.name,
      address: place?.address ?? "",
      lat: poi.lat,
      lng: poi.lng,
      countryCode: place?.countryCode ?? null,
    });
  }

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
    <div className="flex h-screen bg-[#EEE8DC] text-foreground">
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
          onSelectTrip={(tripId) => router.push(`/trips/${tripId}`)}
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
            currentUserId={currentUserId}
            vehicles={vehicles}
            tripTotalKm={tripTotalKm}
            tripTotalMin={tripTotalMin}
            fuelPlan={fuelPlan}
            fuelVehicle={selectedVehicle}
            onSaveTrip={handleSaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onSelectDay={openDayInPlanner}
          />
        )}

        {tab === "planner" && (
          <div
            className={`grid min-h-0 flex-1 gap-0 ${
              showAllDays
                ? "lg:grid-cols-[280px_1fr]"
                : "lg:grid-cols-[280px_minmax(420px,460px)_1fr]"
            }`}
          >
            <div className="flex min-h-0 flex-col border-r border-[#E4DBC8] bg-[#FBF8F1]">
              <header className="relative z-10 flex min-h-[70px] shrink-0 items-center justify-between gap-3 border-b border-[#E4DBC8]/90 bg-[#FBF8F1]/95 px-3.5 py-3 shadow-[0_10px_24px_-18px_rgba(22,19,13,0.75)] backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.24)]">
                    <MapPinned className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-black leading-tight text-foreground">
                      Planner
                    </h2>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {days.length} {days.length === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTripAiOpen(true)}
                    className="grid size-[34px] shrink-0 place-items-center rounded-[10px] border border-[#D8CEB8] bg-[#F3EFE4] text-[#8A5F4D] transition-colors hover:border-[#E4562A]/40 hover:bg-[#FBE7DD] hover:text-[#C6532D]"
                    title="Export whole trip for AI"
                    aria-label="Export whole trip for AI"
                  >
                    <Sparkles className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={addDay}
                    disabled={isAddingDay || isImportingTrip}
                    className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.2)] transition-colors hover:bg-[#cf4822] disabled:cursor-default disabled:opacity-60"
                    title="Add day"
                    aria-label="Add day"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </header>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 pt-3.5">
                {days.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No days yet.
                  </p>
                ) : (
                  days.map((day, i) => {
                    const metric = dayMetrics[day.id];
                    const stops = day.stops;
                    const dateLabel = formatDayDateLabel(
                      getDayDate(i, trip.startDate),
                    );
                    return (
                      <DayListCard
                        key={day.id}
                        dateLabel={dateLabel}
                        index={i}
                        isLast={i === days.length - 1}
                        distanceKm={metric?.distanceKm ?? 0}
                        driveMin={metric?.driveMin ?? 0}
                        firstStopName={stops[0]?.name}
                        lastStopName={stops[stops.length - 1]?.name}
                        active={!showAllDays && day.id === currentDayId}
                        onSelect={() => selectDay(day.id)}
                        onRemove={() => removeDay(day.id)}
                        onMoveUp={() => moveDay(i, -1)}
                        onMoveDown={() => moveDay(i, 1)}
                      />
                    );
                  })
                )}
                <TripSummaryCard
                  dayCount={days.length}
                  active={showAllDays}
                  onSelect={() => {
                    setShowAllDays(true);
                    setSelectedStopId(null);
                  }}
                />
              </div>
            </div>

            {!showAllDays && (
              <main className="h-full min-h-0 border-r border-[#E4DBC8] bg-[#FFFAF0]">
                {currentDay ? (
                  <DayPanel
                    key={currentDay.id}
                    day={currentDay}
                    index={currentDayIndex}
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
                    onAddActivity={addActivity}
                    onUpdateActivity={updateActivity}
                    onRemoveActivity={removeActivity}
                    onReorderActivities={reorderActivities}
                    onSetDayStartTime={(startTime) =>
                      setDayStartTime(currentDay.id, startTime)
                    }
                    onLaunchNav={() => openInGoogleMaps(currentRouteStops)}
                    onOpenStopNotes={openNotesForStop}
                    onSelectStop={setSelectedStopId}
                    stay={currentStay}
                    previousStay={previousStay}
                    showStay
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
              className={`relative flex min-h-[400px] flex-col ${
                rightPanelMode === "notes" ? "bg-[#F8F5ED]" : "bg-[#EEEAE1]"
              }`}
            >
              <div className="absolute left-1/2 top-3 z-[500] grid -translate-x-1/2 grid-cols-2 rounded-[12px] border border-white/50 bg-[#E9E2D5]/90 p-1 shadow-sm backdrop-blur">
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
                  <div className="h-full pt-[58px]">
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
                    stops={allStops}
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
                    showPois
                    onAddPoi={handleAddPoi}
                  />
                )}
                {rightPanelMode === "map" && (
                  <MapRouteSummary
                    title={
                      showAllDays ? "Whole trip" : `Day ${currentDayIndex + 1}`
                    }
                    subtitle={
                      showAllDays
                        ? `${days.length} ${days.length === 1 ? "day" : "days"} · Complete route`
                        : dayRouteLabel(currentStops)
                    }
                    distanceKm={showAllDays ? tripTotalKm : distanceKm}
                    durationMin={showAllDays ? tripTotalMin : driveMin}
                    fuelPln={showAllDays ? tripFuelPln : fuelPln}
                    count={showAllDays ? days.length : currentStops.length}
                    countLabel={
                      showAllDays
                        ? days.length === 1
                          ? "Day"
                          : "Days"
                        : currentStops.length === 1
                          ? "Stop"
                          : "Stops"
                    }
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
            onSelectTrip={(tripId) => router.push(`/trips/${tripId}`)}
            onSelectTab={setTab}
          />
        )}
      </div>
    </div>
  );
}

function MapRouteSummary({
  title,
  subtitle,
  distanceKm,
  durationMin,
  fuelPln,
  count,
  countLabel,
}: {
  title: string;
  subtitle: string;
  distanceKm: number;
  durationMin: number;
  fuelPln: number;
  count: number;
  countLabel: string;
}) {
  const stats = [
    {
      label: "Distance",
      value: distanceKm > 0 ? formatDistance(distanceKm) : "0 km",
      Icon: RouteIcon,
      color: "#E4562A",
    },
    {
      label: "Driving",
      value: durationMin > 0 ? formatDuration(durationMin) : "—",
      Icon: Clock,
      color: "#2E7A57",
    },
    {
      label: "Fuel",
      value: fuelPln > 0 ? `${Math.round(fuelPln)} PLN` : "—",
      Icon: Fuel,
      color: "#5E86A3",
    },
    {
      label: countLabel,
      value: `${count}`,
      Icon: MapPin,
      color: "#8A5F4D",
    },
  ];

  return (
    <aside className="pointer-events-none absolute right-3 top-[64px] z-[500] w-[calc(100%_-_24px)] max-w-[340px] overflow-hidden rounded-[18px] border border-white/60 bg-[#F8F4EC]/92 shadow-[0_14px_36px_rgba(22,19,13,0.16)] backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5 border-b border-[#E7DFCE]/80 px-3.5 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand text-brand-foreground shadow-[0_6px_14px_rgba(228,86,42,0.22)]">
          <MapPinned className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-black leading-tight text-foreground">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[#DED5C3]/80 px-1 py-2.5">
        {stats.map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="flex min-w-0 flex-col items-center px-1.5 text-center"
          >
            <div className="flex min-w-0 items-center gap-1">
              <Icon
                className="size-3 shrink-0"
                strokeWidth={2.5}
                style={{ color }}
              />
              <span
                className="truncate font-mono text-[11px] font-bold text-foreground"
                title={value}
              >
                {value}
              </span>
            </div>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#9A917F]">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-[#E7DFCE]/70 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#8F8675]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-brand" />
          Drive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-[#2E7A57]" />
          Walk
        </span>
      </div>
    </aside>
  );
}

function dayRouteLabel(stops: StopPoint[]) {
  const first = stops[0]?.name;
  const last = stops[stops.length - 1]?.name;
  if (!first && !last) return "Add stops to build this route";
  if (first === last) return `${first} · Loop route`;
  return `${first ?? "Starting point"} → ${last ?? "Destination"}`;
}

function FloatingTripNav({
  activeTab,
  currentTrip,
  trips,
  onSelectTrip,
  onSelectTab,
}: {
  activeTab: ViewKey;
  currentTrip: TripPlain;
  trips: TripSwitcherItem[];
  onSelectTrip: (tripId: string) => void;
  onSelectTab: (tab: ViewKey) => void;
}) {
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
        className="fixed bottom-5 left-1/2 z-[9999] max-w-[calc(100vw-32px)] -translate-x-1/2"
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
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (!active) onSelectTrip(item.id);
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/95 p-2 shadow-[0_16px_42px_rgba(22,19,13,0.22)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex max-w-[210px] shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-foreground transition-colors hover:bg-muted"
            aria-expanded={open}
          >
            <RouteIcon className="size-4 shrink-0 text-brand" />
            <span className="truncate">{currentTrip.name}</span>
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
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm transition-colors " +
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
                {TAB_LABELS[key]}
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
