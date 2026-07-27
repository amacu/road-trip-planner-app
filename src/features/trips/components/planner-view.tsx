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
  Calendar,
  Check,
  ChevronDown,
  Compass,
  LayoutDashboard,
  MapPinned,
  Plus,
  Route as RouteIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { getFuelPriceCountriesAction } from "@/features/fuel/actions";
import { EmptyFuelState } from "@/features/fuel/components/empty-fuel-state";
import { FuelDashboard } from "@/features/fuel/components/fuel-dashboard";
import { HomeScreen } from "@/features/home/components/home-screen";
import {
  createTripPackingItemAction,
  deleteTripPackingItemAction,
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
import { DayPanel } from "@/features/trip-days/components/day-panel";
import {
  deleteTripStayAction,
  saveTripStayAction,
} from "@/features/trip-stays/actions";
import {
  createTripStopAction,
  createUnassignedTripStopAction,
  deleteTripStopAction,
  moveTripStopToDayAction,
  reorderTripStopsAction,
  updateTripStopAction,
} from "@/features/trip-stops/actions";
import { MapView } from "@/features/trip-stops/components/map-view";
import { UnassignedStopsPanel } from "@/features/trip-stops/components/unassigned-stops-panel";
import { DayListCard } from "@/features/trips/components/day-list-card";
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
import { buildDayStopColors } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode-client";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import type { FuelCountryPrice } from "@/lib/integrations/fuel-prices";
import { openInGoogleMaps } from "@/lib/integrations/google-maps";
import type { TripUpdateInput } from "@/lib/validators/trip";
import type { TripStayInput } from "@/lib/validators/trip-stay";
import type {
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

export function PlannerView({
  trip,
  vehicles,
  trips,
  currentUserId,
  currentUserFullName,
  currentUserEmail,
  currentUserAvatarUrl,
}: {
  trip: TripPlain;
  vehicles: VehiclePlain[];
  trips: TripSwitcherItem[];
  currentUserId: string;
  currentUserFullName?: string | null;
  currentUserEmail?: string | null;
  currentUserAvatarUrl?: string | null;
}) {
  const router = useRouter();
  // Local, optimistically-mutable mirror of trip.days. Drag-and-drop (and
  // other mutations) update this immediately so the UI never "snaps back"
  // while waiting on the server; it's resynced whenever fresh props arrive
  // from router.refresh().
  const [days, setDays] = useState<TripPlain["days"]>(trip.days);
  useEffect(() => {
    setDays(trip.days);
  }, [trip.days]);

  const [unassignedStops, setUnassignedStops] = useState<StopPoint[]>(
    trip.unassignedStops,
  );
  useEffect(() => {
    setUnassignedStops(trip.unassignedStops);
  }, [trip.unassignedStops]);

  const [stays, setStays] = useState<TripStayPlain[]>(trip.stays);
  useEffect(() => {
    setStays(trip.stays);
  }, [trip.stays]);

  const [packingItems, setPackingItems] = useState(trip.packingItems);
  const packingItemsRef = useRef(trip.packingItems);
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
  // The stop a user expanded in the day panel — the map recenters on it
  // and shows its activities as extra pins while it's selected.
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewKey>("overview");
  const [fuelPrices, setFuelPrices] = useState<FuelCountryPrice[]>([]);
  const discardedOptimisticStopIds = useRef(new Set<string>());
  const discardedOptimisticActivityIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    getFuelPriceCountriesAction()
      .then((prices) => {
        if (active) setFuelPrices(prices);
      })
      .catch(() => {
        if (active) setFuelPrices([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const isOwner = trip.ownerId === currentUserId;
  const currentDay = days.find((d) => d.id === activeDayId) ?? days[0];
  const currentDayIndex = currentDay
    ? days.findIndex((d) => d.id === currentDay.id)
    : -1;
  const currentDayId = currentDay?.id;
  const currentStops = currentDay?.stops ?? [];
  const isLastDay = currentDayIndex === days.length - 1;
  const currentStay = isLastDay
    ? undefined
    : stays.find((stay) => stay.afterDayId === currentDayId);
  const previousStay = stays.find(
    (stay) => stay.afterDayId === days[currentDayIndex - 1]?.id,
  );
  const allStops = [...days.flatMap((day) => day.stops), ...unassignedStops];
  const selectedStopActivityPins =
    allStops
      .find((stop) => stop.id === selectedStopId)
      ?.activities.filter((a) => a.lat !== 0 || a.lng !== 0)
      .map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title })) ?? [];
  const allStopColors: Record<string, string> = {
    ...buildDayStopColors(days),
    ...Object.fromEntries(unassignedStops.map((stop) => [stop.id, "#8a8270"])),
  };
  const unassignedStopIds = new Set(unassignedStops.map((stop) => stop.id));

  const routeDays = useMemo(
    () =>
      days.map((day, index) => {
        const previousStay = stays.find(
          (stay) => stay.afterDayId === days[index - 1]?.id,
        );
        const stay =
          index < days.length - 1
            ? stays.find((item) => item.afterDayId === day.id)
            : undefined;
        const nextDayFirstStop = days[index + 1]?.stops[0];
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

        return { ...day, stops: points };
      }),
    [days, stays],
  );
  const currentRouteStops =
    routeDays.find((day) => day.id === currentDayId)?.stops ?? currentStops;
  const routeAnchorIds = new Set(
    currentRouteStops
      .filter(
        (stop) =>
          stop.id.startsWith("stay-") || stop.id.startsWith("overnight-"),
      )
      .map((stop) => stop.id),
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

  async function addDay() {
    const previousDay = days[days.length - 1];
    const lastStop = previousDay?.stops[previousDay.stops.length - 1];

    const result = await createTripDayAction(trip.id, {});
    if (!result.success) {
      toast.error(result.error);
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
      stops: [],
    };

    setDays((current) => [...current, nextDay]);
    setActiveDayId(result.data.id);

    if (lastStop) {
      const stopResult = await createTripStopAction(trip.id, result.data.id, {
        name: lastStop.name,
        address: lastStop.address,
        latitude: lastStop.lat,
        longitude: lastStop.lng,
        countryCode: lastStop.countryCode,
      });
      if (!stopResult.success) {
        toast.error(stopResult.error);
      } else {
        setDays((current) =>
          current.map((day) =>
            day.id === result.data.id
              ? {
                  ...day,
                  stops: [
                    {
                      id: stopResult.data.id,
                      name: lastStop.name,
                      address: lastStop.address,
                      lat: lastStop.lat,
                      lng: lastStop.lng,
                      countryCode: lastStop.countryCode,
                      itemType: lastStop.itemType,
                      travelMode: lastStop.travelMode,
                      startTime: lastStop.startTime,
                      endTime: lastStop.endTime,
                      category: lastStop.category,
                      description: lastStop.description,
                      visitDurationMin: null,
                      notes: null,
                      activities: [],
                    },
                  ],
                }
              : day,
          ),
        );
      }
    }
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

  function removeDay(dayId: string) {
    if (!confirm("Delete this day and all its stops?")) return;

    const previousDays = days;
    const previousActiveDayId = activeDayId;
    const removedIndex = days.findIndex((day) => day.id === dayId);
    const nextDays = days.filter((day) => day.id !== dayId);
    const nextActiveDayId =
      activeDayId === dayId
        ? (nextDays[Math.max(0, removedIndex - 1)]?.id ??
          nextDays[0]?.id ??
          null)
        : activeDayId;

    setDays(nextDays);
    setActiveDayId(nextActiveDayId);

    deleteTripDayAction(trip.id, dayId).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        setActiveDayId(previousActiveDayId);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
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

  function addStop(
    dayId: string,
    data: GeocodeResult,
    itemType: "stop" | "activity" = "stop",
  ) {
    const previousDays = days;
    const optimisticId = `optimistic-stop-${randomId()}`;
    const optimisticStop: StopPoint = {
      id: optimisticId,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      countryCode: data.countryCode,
      itemType,
      travelMode: "driving",
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

    createTripStopAction(trip.id, dayId, {
      name: data.name,
      address: data.address,
      latitude: data.lat,
      longitude: data.lng,
      countryCode: data.countryCode,
      stopType: itemType,
      travelMode: "driving",
    }).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        toast.error(result.error);
        return;
      }

      if (discardedOptimisticStopIds.current.has(optimisticId)) {
        discardedOptimisticStopIds.current.delete(optimisticId);
        deleteTripStopAction(trip.id, result.data.id);
        return;
      }

      setDays((current) =>
        current.map((day) => ({
          ...day,
          stops: day.stops.map((stop) =>
            stop.id === optimisticId ? { ...stop, id: result.data.id } : stop,
          ),
        })),
      );
    });
  }

  function addUnassignedStop(data: GeocodeResult) {
    const previousUnassignedStops = unassignedStops;
    const optimisticId = `optimistic-stop-${randomId()}`;
    const optimisticStop: StopPoint = {
      id: optimisticId,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      countryCode: data.countryCode,
      itemType: "stop",
      travelMode: "driving",
      startTime: null,
      endTime: null,
      category: null,
      description: null,
      visitDurationMin: null,
      notes: null,
      activities: [],
    };

    setUnassignedStops((current) => [...current, optimisticStop]);

    createUnassignedTripStopAction(trip.id, {
      name: data.name,
      address: data.address,
      latitude: data.lat,
      longitude: data.lng,
      countryCode: data.countryCode,
    }).then((result) => {
      if (!result.success) {
        setUnassignedStops(previousUnassignedStops);
        toast.error(result.error);
        return;
      }

      if (discardedOptimisticStopIds.current.has(optimisticId)) {
        discardedOptimisticStopIds.current.delete(optimisticId);
        deleteTripStopAction(trip.id, result.data.id);
        return;
      }

      setUnassignedStops((current) =>
        current.map((stop) =>
          stop.id === optimisticId ? { ...stop, id: result.data.id } : stop,
        ),
      );
    });
  }

  function moveStopToDay(stopId: string, dayId: string) {
    const stop = unassignedStops.find((s) => s.id === stopId);
    if (!stop || stopId.startsWith("optimistic-stop-")) return;

    const previousUnassignedStops = unassignedStops;
    const previousDays = days;

    setUnassignedStops((current) => current.filter((s) => s.id !== stopId));
    setDays((current) =>
      current.map((day) =>
        day.id === dayId ? { ...day, stops: [...day.stops, stop] } : day,
      ),
    );

    moveTripStopToDayAction(trip.id, stopId, { dayId }).then((result) => {
      if (!result.success) {
        setUnassignedStops(previousUnassignedStops);
        setDays(previousDays);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function updateStop(stopId: string, patch: Partial<StopPoint>) {
    if (stopId.startsWith("optimistic-stop-")) return;

    const previousDays = days;
    const previousUnassignedStops = unassignedStops;
    const applyPatch = (stop: StopPoint) =>
      stop.id === stopId ? { ...stop, ...patch } : stop;
    setDays((current) =>
      current.map((day) => ({ ...day, stops: day.stops.map(applyPatch) })),
    );
    setUnassignedStops((current) => current.map(applyPatch));

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
      setUnassignedStops(previousUnassignedStops);
      toast.error(result.error);
    }
  }

  function removeStop(stopId: string) {
    // Optimistic: remove locally first so the UI settles immediately,
    // then persist in the background. Roll back only if the save fails.
    const previousDays = days;
    const previousUnassignedStops = unassignedStops;
    setDays((current) =>
      current.map((d) => ({
        ...d,
        stops: d.stops.filter((stop) => stop.id !== stopId),
      })),
    );
    setUnassignedStops((current) =>
      current.filter((stop) => stop.id !== stopId),
    );

    if (stopId.startsWith("optimistic-stop-")) {
      discardedOptimisticStopIds.current.add(stopId);
      return;
    }

    deleteTripStopAction(trip.id, stopId).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        setUnassignedStops(previousUnassignedStops);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function addActivity(stopId: string, place: GeocodeResult) {
    const previousDays = days;
    const previousUnassignedStops = unassignedStops;
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
    setUnassignedStops((current) => current.map(appendActivity));

    createTripActivityAction(trip.id, stopId, {
      title: place.name,
      address: place.address,
      latitude: place.lat,
      longitude: place.lng,
      category: "sightseeing",
    }).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        setUnassignedStops(previousUnassignedStops);
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
      setUnassignedStops((current) => current.map(resolveActivity));
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
      setUnassignedStops((current) => current.map(patchActivity));
      return;
    }

    const result = await updateTripActivityAction(trip.id, activityId, patch);
    if (!result.success) toast.error(result.error);
  }

  function removeActivity(activityId: string) {
    const previousDays = days;
    const previousUnassignedStops = unassignedStops;

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
    setUnassignedStops((current) => current.map(dropActivity));

    if (activityId.startsWith("optimistic-activity-")) {
      discardedOptimisticActivityIds.current.add(activityId);
      return;
    }

    deleteTripActivityAction(trip.id, activityId).then((result) => {
      if (!result.success) {
        setDays(previousDays);
        setUnassignedStops(previousUnassignedStops);
        toast.error(result.error);
        return;
      }
    });
  }

  function reorderActivities(stopId: string, orderedActivityIds: string[]) {
    const previousDays = days;
    const previousUnassignedStops = unassignedStops;

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
    setUnassignedStops((current) => current.map(applyOrder));

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
        setUnassignedStops(previousUnassignedStops);
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

  const daySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDayDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = days.findIndex((d) => d.id === active.id);
    const to = days.findIndex((d) => d.id === over.id);
    if (from < 0 || to < 0) return;

    reorderDays(arrayMove(days, from, to).map((d) => d.id));
  }

  async function handleStopMove(stopId: string, lat: number, lng: number) {
    const place = await reverseGeocode(lat, lng);
    await updateStop(stopId, {
      lat,
      lng,
      address: place?.address,
      countryCode: place?.countryCode ?? null,
    });
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
    <div className="flex h-screen bg-background text-foreground">
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
            tripFuelPln={tripFuelPln}
            onSaveTrip={handleSaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onSelectDay={openDayInPlanner}
          />
        )}

        {tab === "planner" && (
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[280px_minmax(420px,460px)_1fr]">
            <div className="flex min-h-0 flex-col border-r border-border bg-card">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                  Trip days
                </h2>
                <button
                  onClick={addDay}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-brand-foreground hover:bg-[#cf4822]"
                >
                  <Plus className="size-3.5" />
                  Add day
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {days.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No days yet.
                  </p>
                ) : (
                  <DndContext
                    id="trip-days-dnd"
                    sensors={daySensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDayDragEnd}
                  >
                    <SortableContext
                      items={days.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {days.map((day, i) => {
                        const metric = dayMetrics[day.id];
                        const stops = day.stops;
                        const dateLabel = formatDayDateLabel(
                          getDayDate(i, trip.startDate),
                        );
                        return (
                          <DayListCard
                            key={day.id}
                            id={day.id}
                            dateLabel={dateLabel}
                            index={i}
                            distanceKm={metric?.distanceKm ?? 0}
                            driveMin={metric?.driveMin ?? 0}
                            firstStopName={stops[0]?.name}
                            lastStopName={stops[stops.length - 1]?.name}
                            active={!showAllDays && day.id === currentDayId}
                            onSelect={() => selectDay(day.id)}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <div className="p-3">
                <TripSummaryCard
                  dayCount={days.length}
                  totalKm={tripTotalKm}
                  totalMin={tripTotalMin}
                  fuelPln={tripFuelPln}
                  active={showAllDays}
                  onSelect={() => {
                    setShowAllDays(true);
                    setSelectedStopId(null);
                  }}
                />
              </div>
            </div>

            <main className="h-full min-h-0 border-r border-border bg-[#fffaf0]">
              {showAllDays ? (
                <UnassignedStopsPanel
                  stops={unassignedStops}
                  days={days}
                  onAddStop={addUnassignedStop}
                  onMoveStopToDay={moveStopToDay}
                  onUpdateStop={updateStop}
                  onRemoveStop={removeStop}
                  onAddActivity={addActivity}
                  onUpdateActivity={updateActivity}
                  onRemoveActivity={removeActivity}
                  onReorderActivities={reorderActivities}
                  onSelectStop={setSelectedStopId}
                />
              ) : currentDay ? (
                <DayPanel
                  key={currentDay.id}
                  day={currentDay}
                  index={currentDayIndex}
                  dateLabel={formatDayDateLabel(
                    getDayDate(currentDayIndex, trip.startDate),
                  )}
                  stops={currentStops}
                  distanceKm={distanceKm}
                  driveMin={driveMin}
                  fuelPln={fuelPln}
                  legs={regularLegs}
                  startLeg={startStayLeg}
                  endLeg={endStayLeg}
                  onRemoveDay={() => removeDay(currentDay.id)}
                  onAddStop={(result, itemType) =>
                    addStop(currentDay.id, result, itemType)
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
                  onSelectStop={setSelectedStopId}
                  stay={currentStay}
                  previousStay={previousStay}
                  showStay={!isLastDay}
                  onSaveStay={saveStay}
                  onDeleteStay={() => removeStay(currentStay?.id)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No days yet.</p>
                  <button
                    onClick={addDay}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground hover:bg-brand/90"
                  >
                    Add first day
                  </button>
                </div>
              )}
            </main>

            <section className="relative min-h-[400px]">
              {showAllDays ? (
                <MapView
                  stops={allStops}
                  stopColors={allStopColors}
                  excludeFromRouteIds={unassignedStopIds}
                  activeStopId={selectedStopId ?? undefined}
                  activityPins={selectedStopActivityPins}
                />
              ) : (
                <MapView
                  stops={currentRouteStops}
                  onStopMove={handleStopMove}
                  nonDraggableIds={routeAnchorIds}
                  activeStopId={selectedStopId ?? undefined}
                  activityPins={selectedStopActivityPins}
                  showPois
                  onAddPoi={handleAddPoi}
                />
              )}
            </section>
          </div>
        )}

        {tab === "fuel" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedVehicle ? (
              <FuelDashboard
                plan={fuelPlan}
                vehicle={selectedVehicle}
                stays={stays.filter(
                  (stay) => stay.afterDayId !== days[days.length - 1]?.id,
                )}
                packingItems={packingItems}
                onCreatePackingItem={createPackingItem}
                onUpdatePackingItem={updatePackingItem}
                onDeletePackingItem={deletePackingItem}
              />
            ) : (
              <EmptyFuelState
                isOwner={isOwner}
                stays={stays.filter(
                  (stay) => stay.afterDayId !== days[days.length - 1]?.id,
                )}
                packingItems={packingItems}
                onCreatePackingItem={createPackingItem}
                onUpdatePackingItem={updatePackingItem}
                onDeletePackingItem={deletePackingItem}
              />
            )}
          </div>
        )}

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
