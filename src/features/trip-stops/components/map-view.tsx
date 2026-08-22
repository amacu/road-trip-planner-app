"use client";

import {
  Check,
  LocateFixed,
  Navigation,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "leaflet/dist/leaflet.css";
import type {
  Circle,
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline,
} from "leaflet";

import {
  buildRouteSegments,
  fallbackRouteForStops,
  fetchDrivingRoute,
  fetchWalkingRoute,
  routeSignature,
  walkingRouteForStops,
} from "@/lib/integrations/routing";
import { fetchPois } from "@/lib/poi-client";
import type { PoiCategory, PoiResult } from "@/lib/integrations/poi";
import { openInGoogleMaps } from "@/lib/integrations/google-maps";
import type { StopPoint } from "@/features/trips/lib/trip-view-model";
import type { MapActivityPin } from "@/features/trip-stops/lib/activity-map-pins";

// POI names come from OpenStreetMap (Overpass), an external data source we
// don't control — they're interpolated into a Leaflet popup's innerHTML
// below, so this prevents any HTML/script content in a malicious/vandalized
// OSM node's name field from executing in the page.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Below this zoom level the visible area is too large for a POI query to
// stay both fast and uncluttered (Overpass would return thousands of
// nodes) — matches roughly "a town/neighborhood is on screen".
const POI_MIN_ZOOM = 14;
const POI_FETCH_DEBOUNCE_MS = 400;

type MarkerFilters = {
  stops: boolean;
  activities: boolean;
};

const MARKER_FILTER_OPTIONS: Array<{
  key: keyof MarkerFilters;
  label: string;
  description: string;
}> = [
  {
    key: "stops",
    label: "Stops",
    description: "Route stops and overnight stays",
  },
  {
    key: "activities",
    label: "Activities",
    description: "Attractions and planned activities",
  },
];

const POI_STYLES: Record<
  PoiCategory,
  { color: string; soft: string; symbol: string; label: string }
> = {
  food: { color: "#B8431F", soft: "#FBE7DD", symbol: "🍴", label: "Food" },
  coffee: { color: "#8a5f4d", soft: "#F0EADB", symbol: "☕", label: "Coffee" },
  attraction: {
    color: "#2E7A57",
    soft: "#E1EFE7",
    symbol: "★",
    label: "Attraction",
  },
  fuel: { color: "#3f6a8c", soft: "#E8F0F6", symbol: "⛽", label: "Fuel" },
  lodging: {
    color: "#6E9BC0",
    soft: "#E8F0F6",
    symbol: "🛏",
    label: "Lodging",
  },
};

type Props = {
  stops: StopPoint[];
  /** Whether to draw a connecting route. Useful for marker-only overview maps. */
  showRoute?: boolean;
  /** Stable identity of the route currently shown (for example a day id). Changing it re-fits the camera without reacting to ordinary stop edits. */
  viewportKey?: string;
  activeStopId?: string;
  /** Optional per-stop marker color (e.g. one color per day) keyed by stop id, overriding the default active/inactive coloring. */
  stopColors?: Record<string, string>;
  /** Optional marker text keyed by stop id, used to keep map numbering aligned with the route list. */
  markerLabels?: Record<string, string>;
  /** Stop ids to exclude from the connecting route line while keeping their markers visible. */
  excludeFromRouteIds?: ReadonlySet<string>;
  /** Activity pins available in the current map scope. */
  activityPins?: MapActivityPin[];
  /** When true, nearby points of interest (restaurants, attractions, fuel, lodging, cafes) load automatically once the user zooms in far enough, like Google Maps. */
  showPois?: boolean;
  /** Called when a user clicks a POI marker's "add" action — lets callers add it as a stop. */
  onAddPoi?: (poi: PoiResult) => void;
  /** Desktop-only width occupied by panels overlaying the map from the left. Camera fitting uses only the unobscured workspace. */
  desktopLeftInset?: number;
};

export function MapView({
  stops,
  showRoute = true,
  viewportKey,
  activeStopId,
  stopColors,
  markerLabels,
  excludeFromRouteIds,
  activityPins,
  showPois,
  onAddPoi,
  desktopLeftInset = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const activityMarkersRef = useRef<LeafletMarker[]>([]);
  const activityLinesRef = useRef<Polyline[]>([]);
  const poiMarkersRef = useRef<LeafletMarker[]>([]);
  const userLocationMarkerRef = useRef<LeafletMarker | null>(null);
  const userLocationAccuracyRef = useRef<Circle | null>(null);
  const geolocationWatchRef = useRef<number | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const mapVisibleRef = useRef(false);
  const userLocationRef = useRef<[number, number] | null>(null);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [markerFilters, setMarkerFilters] = useState<MarkerFilters>({
    stops: true,
    activities: true,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const markerFiltersRef = useRef<MarkerFilters>({
    stops: true,
    activities: true,
  });
  const routeLinesRef = useRef<Polyline[]>([]);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onAddPoiRef = useRef(onAddPoi);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initialFrameRef = useRef<number | null>(null);
  const routeRequestRef = useRef<AbortController | null>(null);
  const lastRouteSignatureRef = useRef<string | null>(null);
  const poiRequestRef = useRef<AbortController | null>(null);
  const poiDebounceRef = useRef<number | null>(null);
  // Always reflects the latest props, readable from inside the async
  // Leaflet-init callback below (which captures stale closures otherwise).
  const stopsRef = useRef(stops);
  const showRouteRef = useRef(showRoute);
  const activeStopIdRef = useRef(activeStopId);
  const stopColorsRef = useRef(stopColors);
  const markerLabelsRef = useRef(markerLabels);
  const excludeFromRouteIdsRef = useRef(excludeFromRouteIds);
  const activityPinsRef = useRef(activityPins);
  const showPoisRef = useRef(showPois);
  const viewportKeyRef = useRef(viewportKey);
  const desktopLeftInsetRef = useRef(desktopLeftInset);
  // Tracks the activeStopId that was in effect the last time we moved the
  // viewport, so we only re-fit/refocus when the *selection* changes — not
  // on every unrelated re-render (e.g. a stop's name being edited).
  const lastFocusedStopIdRef = useRef<string | undefined>(undefined);
  const lastViewportKeyRef = useRef<string | undefined>(undefined);
  const hasFittedOnceRef = useRef(false);

  useEffect(() => {
    onAddPoiRef.current = onAddPoi;
  }, [onAddPoi]);

  useEffect(() => {
    showPoisRef.current = showPois;
    if (!showPois) {
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
      poiRequestRef.current?.abort();
    } else {
      loadPoisForViewport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPois]);

  useEffect(() => {
    stopsRef.current = stops;
    showRouteRef.current = showRoute;
    viewportKeyRef.current = viewportKey;
    activeStopIdRef.current = activeStopId;
    stopColorsRef.current = stopColors;
    markerLabelsRef.current = markerLabels;
    excludeFromRouteIdsRef.current = excludeFromRouteIds;
    activityPinsRef.current = activityPins;
    desktopLeftInsetRef.current = desktopLeftInset;
  }, [
    stops,
    showRoute,
    viewportKey,
    activeStopId,
    stopColors,
    markerLabels,
    excludeFromRouteIds,
    activityPins,
    desktopLeftInset,
  ]);

  function visibleLeftInset() {
    return typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
      ? desktopLeftInsetRef.current
      : 0;
  }

  function centerPointInVisibleWorkspace() {
    const map = mapRef.current;
    const inset = visibleLeftInset();
    if (map && inset > 0) map.panBy([-inset / 2, 0], { animate: false });
  }

  function updateUserLocation(coords: GeolocationCoordinates) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !navigator.geolocation) return;

    const position: [number, number] = [coords.latitude, coords.longitude];
    userLocationRef.current = position;
    setHasUserLocation(true);

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLatLng(position);
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<div aria-hidden="true" style="
              width: 22px; height: 22px;
              border-radius: 999px;
              background: #2563EB;
              border: 4px solid white;
              box-shadow: 0 2px 10px rgba(15, 23, 42, 0.35), 0 0 0 5px rgba(37, 99, 235, 0.2);
            "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      userLocationMarkerRef.current = L.marker(position, {
        icon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindTooltip("Your location", {
          direction: "top",
          offset: [0, -14],
        });
    }

    const accuracyRadius = Math.min(coords.accuracy, 5000);
    if (userLocationAccuracyRef.current) {
      userLocationAccuracyRef.current
        .setLatLng(position)
        .setRadius(accuracyRadius);
    } else {
      userLocationAccuracyRef.current = L.circle(position, {
        radius: accuracyRadius,
        color: "#2563EB",
        weight: 1,
        opacity: 0.35,
        fillColor: "#3B82F6",
        fillOpacity: 0.09,
        interactive: false,
      }).addTo(map);
    }
  }

  function stopUserLocationTracking() {
    if (geolocationWatchRef.current === null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(geolocationWatchRef.current);
    geolocationWatchRef.current = null;
  }

  function startUserLocationTracking() {
    if (
      geolocationWatchRef.current !== null ||
      !mapVisibleRef.current ||
      !navigator.geolocation
    ) {
      return;
    }

    geolocationWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => updateUserLocation(coords),
      () => {
        // Permission denial and unavailable GPS are intentionally silent: the
        // trip map remains fully usable without sharing the user's location.
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  }

  function focusUserLocation() {
    const map = mapRef.current;
    const position = userLocationRef.current;
    if (!map || !position) return;

    map.once("moveend", centerPointInVisibleWorkspace);
    map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.6 });

    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => updateUserLocation(coords),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }

  function navigationPointsForCurrentFilter() {
    const currentStops = stops;
    const currentActivityPins = activityPins ?? [];
    const map = mapRef.current;
    const stopsById = new Map(currentStops.map((stop) => [stop.id, stop]));
    const filteredActivityPins = currentActivityPins.filter((pin) => {
      if (stopsById.has(pin.id)) return false;
      const parent = stopsById.get(pin.parentStopId);
      return (
        !parent ||
        !map ||
        map.distance([parent.lat, parent.lng], [pin.lat, pin.lng]) > 50
      );
    });

    if (markerFilters.stops && !markerFilters.activities) {
      return currentStops.filter((stop) => stop.itemType !== "activity");
    }

    if (!markerFilters.stops && markerFilters.activities) {
      return [
        ...currentStops.filter((stop) => stop.itemType === "activity"),
        ...filteredActivityPins,
      ];
    }

    if (!markerFilters.stops && !markerFilters.activities) return [];

    const pinsByParent = new Map<string, MapActivityPin[]>();
    filteredActivityPins.forEach((pin) => {
      const pins = pinsByParent.get(pin.parentStopId) ?? [];
      pins.push(pin);
      pinsByParent.set(pin.parentStopId, pins);
    });
    const orderedPoints = currentStops.flatMap((stop) => [
      stop,
      ...(pinsByParent.get(stop.id) ?? []),
    ]);
    const includedPinIds = new Set(orderedPoints.map((point) => point.id));
    return [
      ...orderedPoints,
      ...filteredActivityPins.filter((pin) => !includedPinIds.has(pin.id)),
    ];
  }

  function drawMarkersAndRoute({ redrawRoute = true } = {}) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const currentStops = stopsRef.current;
    const currentViewportKey = viewportKeyRef.current;
    const currentActiveStopId = activeStopIdRef.current;
    const currentStopColors = stopColorsRef.current;
    const currentMarkerLabels = markerLabelsRef.current;
    const currentMarkerFilters = markerFiltersRef.current;
    const currentExcludeFromRouteIds = excludeFromRouteIdsRef.current;
    const routeStops = currentExcludeFromRouteIds
      ? currentStops.filter((stop) => !currentExcludeFromRouteIds.has(stop.id))
      : currentStops;

    map.stop();
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    currentStops.forEach((stop, idx) => {
      const isStay = stop.id.startsWith("stay-");
      const isOvernightEnd = stop.id.startsWith("overnight-");
      const isActivity = stop.itemType === "activity";
      if (
        (isActivity && !currentMarkerFilters.activities) ||
        (!isActivity && !currentMarkerFilters.stops)
      ) {
        return;
      }
      const stopNumber = currentStops
        .slice(0, idx + 1)
        .filter(
          (item) =>
            !item.id.startsWith("stay-") &&
            !item.id.startsWith("overnight-") &&
            item.itemType !== "activity",
        ).length;
      const isActive = stop.id === currentActiveStopId;
      const markerColor =
        isStay || isOvernightEnd
          ? "#526F7D"
          : ((isActivity ? "#7C5CBF" : currentStopColors?.[stop.id]) ??
            (isActive ? "var(--color-brand)" : "#16130D"));
      const markerLabel =
        currentMarkerLabels?.[stop.id] ?? (isActivity ? "★" : `${stopNumber}`);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: ${markerColor};
          color: white;
          width: 30px; height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:12px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        "><span style="transform: rotate(45deg)">${isStay ? "☾" : isOvernightEnd ? "→" : escapeHtml(markerLabel)}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      const marker = L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `${isStay ? "Overnight · " : isOvernightEnd ? "" : `${escapeHtml(markerLabel)}. `}${escapeHtml(stop.name)}`,
          {
            direction: "top",
            offset: [0, -28],
          },
        );
      markersRef.current.push(marker);
    });

    activityMarkersRef.current.forEach((m) => m.remove());
    activityMarkersRef.current = [];
    activityLinesRef.current.forEach((line) => line.remove());
    activityLinesRef.current = [];

    const stopsById = new Map(currentStops.map((stop) => [stop.id, stop]));
    const currentActivityPins = currentMarkerFilters.activities
      ? (activityPinsRef.current ?? []).filter((pin) => {
          if (stopsById.has(pin.id)) return false;
          const parentStop = stopsById.get(pin.parentStopId);
          if (!parentStop) return true;

          // Some activity cards also contain a nested location record at
          // effectively the same coordinates. Drawing both puts a star on
          // top of the numbered itinerary marker, so keep only the parent.
          return (
            map.distance([parentStop.lat, parentStop.lng], [pin.lat, pin.lng]) >
            50
          );
        })
      : [];
    const focusedActivityPins = currentActiveStopId
      ? currentActivityPins.filter(
          (pin) => pin.parentStopId === currentActiveStopId,
        )
      : [];

    currentActivityPins.forEach((pin) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: #7C5CBF;
          color: white;
          width: 26px; height: 26px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight:800;font-size:${pin.label.length > 2 ? "8px" : "11px"};
        "><span style="transform: rotate(45deg)">${escapeHtml(pin.label)}</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindTooltip(`${escapeHtml(pin.label)}. ${escapeHtml(pin.title)}`, {
          direction: "top",
          offset: [0, -24],
        });
      activityMarkersRef.current.push(marker);
    });

    const activityGroups = new Map<string, MapActivityPin[]>();
    currentActivityPins.forEach((pin) => {
      const group = activityGroups.get(pin.parentStopId) ?? [];
      group.push(pin);
      activityGroups.set(pin.parentStopId, group);
    });
    activityGroups.forEach((pins, parentStopId) => {
      const parentStop = stopsById.get(parentStopId);
      const points: Array<[number, number]> = [
        ...(currentMarkerFilters.stops && parentStop
          ? ([[parentStop.lat, parentStop.lng]] as Array<[number, number]>)
          : []),
        ...pins.map((pin) => [pin.lat, pin.lng] as [number, number]),
      ];
      if (points.length < 2) return;
      activityLinesRef.current.push(
        L.polyline(points, {
          color: "#7C5CBF",
          weight: 3,
          opacity: 0.72,
          dashArray: "5 8",
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(map),
      );
    });

    // Only move the viewport when the *selection* actually changed — an
    // unrelated re-render (e.g. editing a stop's name) shouldn't yank the
    // map back to a fitBounds/recenter the user didn't ask for.
    const selectionChanged =
      lastFocusedStopIdRef.current !== currentActiveStopId;
    lastFocusedStopIdRef.current = currentActiveStopId;
    const viewportChanged = lastViewportKeyRef.current !== currentViewportKey;
    lastViewportKeyRef.current = currentViewportKey;

    const activeStop = currentStops.find((s) => s.id === currentActiveStopId);

    const shouldFit =
      viewportChanged || selectionChanged || !hasFittedOnceRef.current;
    hasFittedOnceRef.current = true;

    if (shouldFit && activeStop) {
      const leftInset = visibleLeftInset();
      const focusPoints: Array<[number, number]> = [
        [activeStop.lat, activeStop.lng],
        ...focusedActivityPins.map((p) => [p.lat, p.lng] as [number, number]),
      ];
      if (focusPoints.length > 1) {
        map.fitBounds(L.latLngBounds(focusPoints), {
          paddingTopLeft: [leftInset + 64, 80],
          paddingBottomRight: [64, 80],
          maxZoom: 16,
        });
      } else {
        map.setView([activeStop.lat, activeStop.lng], 15, { animate: false });
        centerPointInVisibleWorkspace();
      }
    } else if (shouldFit && currentStops.length === 1) {
      map.setView([currentStops[0].lat, currentStops[0].lng], 14, {
        animate: false,
      });
      centerPointInVisibleWorkspace();
    } else if (shouldFit && currentStops.length > 1) {
      const leftInset = visibleLeftInset();
      const bounds = L.latLngBounds(
        currentStops.map((s) => [s.lat, s.lng] as [number, number]),
      );
      map.fitBounds(bounds, {
        paddingTopLeft: [leftInset + 56, 92],
        paddingBottomRight: [56, 112],
        maxZoom: 14,
        animate: true,
        duration: 0.45,
      });
    }

    if (!redrawRoute) return;

    const nextRouteSignature =
      showRouteRef.current && routeStops.length >= 2
        ? routeSignature(routeStops)
        : null;
    if (lastRouteSignatureRef.current === nextRouteSignature) return;
    lastRouteSignatureRef.current = nextRouteSignature;

    routeLinesRef.current.forEach((line) => line.remove());
    routeLinesRef.current = [];
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    if (!showRouteRef.current || routeStops.length < 2) return;

    const routeSegments = buildRouteSegments(routeStops);

    const drawRoutes = (
      routes: Array<{
        path: Array<[number, number]>;
      } | null>,
      fallbackSegments: boolean[] = [],
    ) => {
      routeLinesRef.current.forEach((line) => line.remove());
      routeLinesRef.current = routes.flatMap((route, index) => {
        if (!route) return [];
        const walking = routeSegments[index].mode === "walking";
        const fallback = fallbackSegments[index] ?? false;
        return [
          L.polyline(route.path, {
            color: walking ? "#2E7A57" : "var(--color-brand)",
            weight: walking ? 4 : 5,
            opacity: fallback ? 0.5 : walking ? 0.82 : 0.9,
            dashArray: walking ? "7 8" : fallback ? "2 9" : undefined,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map),
        ];
      });
    };

    drawRoutes(
      routeSegments.map((segment) =>
        segment.mode === "walking"
          ? walkingRouteForStops([segment.from, segment.to])
          : fallbackRouteForStops([segment.from, segment.to]),
      ),
      routeSegments.map(() => true),
    );

    const controller = new AbortController();
    routeRequestRef.current = controller;
    Promise.all(
      routeSegments.map((segment) => {
        const pair = [segment.from, segment.to];
        return segment.mode === "walking"
          ? fetchWalkingRoute(pair, controller.signal)
          : fetchDrivingRoute(pair, controller.signal);
      }),
    )
      .then((routes) => {
        if (controller.signal.aborted) return;
        const resolvedRoutes = routes.map(
          (route, index) =>
            route ??
            (routeSegments[index].mode === "walking"
              ? walkingRouteForStops([
                  routeSegments[index].from,
                  routeSegments[index].to,
                ])
              : fallbackRouteForStops([
                  routeSegments[index].from,
                  routeSegments[index].to,
                ])),
        );
        drawRoutes(
          resolvedRoutes,
          routes.map((route) => route === null),
        );
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Could not fetch driving route", error);
        }
      });
  }

  function drawPois(pois: PoiResult[]) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    pois.forEach((poi) => {
      const style = POI_STYLES[poi.category];
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: white;
          color: ${style.color};
          width: 24px; height: 24px;
          border-radius: 50%;
          border: 2px solid ${style.color};
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;line-height:1;
        ">${style.symbol}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([poi.lat, poi.lng], { icon, zIndexOffset: -100 })
        .addTo(map)
        .bindPopup(
          `<div style="padding:14px 16px;font-family:'Hanken Grotesk',ui-sans-serif,sans-serif">` +
            `<span style="display:inline-flex;align-items:center;gap:5px;background:${style.soft};color:${style.color};border-radius:999px;padding:3px 10px 3px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px">` +
            `<span>${style.symbol}</span>${style.label}</span>` +
            `<div style="font-family:'Bricolage Grotesque',ui-sans-serif,sans-serif;font-size:15px;font-weight:800;letter-spacing:-.01em;color:#16130D;margin-bottom:12px;line-height:1.25">${escapeHtml(poi.name)}</div>` +
            `<button type="button" data-poi-add style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;font:700 13px 'Hanken Grotesk',ui-sans-serif,sans-serif;background:var(--color-brand);color:#FFFAF0;border:none;border-radius:10px;padding:9px 12px;cursor:pointer">` +
            `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Add as stop</button>` +
            `</div>`,
        );
      marker.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null)?.querySelector(
          "[data-poi-add]",
        );
        el?.addEventListener(
          "click",
          () => {
            onAddPoiRef.current?.(poi);
            marker.closePopup();
          },
          { once: true },
        );
      });
      poiMarkersRef.current.push(marker);
    });
  }

  function loadPoisForViewport() {
    const map = mapRef.current;
    if (!map || !mapVisibleRef.current || !showPoisRef.current) return;

    if (map.getZoom() < POI_MIN_ZOOM) {
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
      return;
    }

    if (poiDebounceRef.current) window.clearTimeout(poiDebounceRef.current);
    poiDebounceRef.current = window.setTimeout(() => {
      const bounds = map.getBounds();
      poiRequestRef.current?.abort();
      const controller = new AbortController();
      poiRequestRef.current = controller;
      fetchPois(
        {
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        },
        controller.signal,
      )
        .then((pois) => {
          if (!controller.signal.aborted) drawPois(pois);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.warn("Could not fetch POIs", error);
          }
        });
    }, POI_FETCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      const initialStops = stopsRef.current;
      const initialCenter: [number, number] =
        initialStops.length > 0
          ? [initialStops[0].lat, initialStops[0].lng]
          : [36.9, -121.8];

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 8,
        zoomControl: false,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      const setMapVisibility = (visible: boolean) => {
        if (mapVisibleRef.current === visible) return;
        mapVisibleRef.current = visible;
        if (visible) {
          map.invalidateSize();
          startUserLocationTracking();
          drawMarkersAndRoute();
          loadPoisForViewport();
        } else {
          stopUserLocationTracking();
          routeRequestRef.current?.abort();
          routeRequestRef.current = null;
          lastRouteSignatureRef.current = null;
          poiRequestRef.current?.abort();
          poiRequestRef.current = null;
          if (poiDebounceRef.current) {
            window.clearTimeout(poiDebounceRef.current);
            poiDebounceRef.current = null;
          }
        }
      };

      if ("IntersectionObserver" in window) {
        const visibilityObserver = new IntersectionObserver(
          ([entry]) => setMapVisibility(entry.isIntersecting),
          { threshold: 0.01 },
        );
        visibilityObserver.observe(containerRef.current);
        visibilityObserverRef.current = visibilityObserver;
      } else {
        setMapVisibility(true);
      }

      // Re-fetch POIs whenever the visible area settles (pan or zoom) —
      // debounced in loadPoisForViewport so rapid pans don't spam the API.
      map.on("moveend", loadPoisForViewport);

      // The container's real size isn't known until layout settles (e.g.
      // remounting this component after switching planner tabs, inside a
      // flex/grid parent). Without this, Leaflet freezes at its 0×0-sized
      // initial bounds and never draws markers/route correctly until a
      // manual resize. requestAnimationFrame waits one paint for layout.
      //
      // This also draws markers/route directly, rather than relying only
      // on the [stops, activeStopId] effect below: `import("leaflet")` is
      // always asynchronous, so that effect runs (and no-ops, since
      // LRef/mapRef are still null) before this callback ever resolves.
      // Without this call, the map would stay blank until stops changed
      // again for some other reason (e.g. adding a new stop).
      initialFrameRef.current = requestAnimationFrame(() => {
        initialFrameRef.current = null;
        if (
          cancelled ||
          mapRef.current !== map ||
          !containerRef.current?.isConnected ||
          !mapVisibleRef.current
        ) {
          return;
        }
        map.invalidateSize();
        drawMarkersAndRoute();
        loadPoisForViewport();
      });

      // Keep Leaflet's internal size in sync with the container's actual
      // dimensions any time they change (sidebar collapse/expand, window
      // resize, or the container going from display:none to visible).
      const resizeObserver = new ResizeObserver(() => {
        if (
          cancelled ||
          mapRef.current !== map ||
          !containerRef.current?.isConnected ||
          !mapVisibleRef.current
        ) {
          return;
        }
        map.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);
      resizeObserverRef.current = resizeObserver;
    })();
    return () => {
      cancelled = true;
      routeRequestRef.current?.abort();
      routeRequestRef.current = null;
      poiRequestRef.current?.abort();
      poiRequestRef.current = null;
      stopUserLocationTracking();
      if (initialFrameRef.current !== null) {
        cancelAnimationFrame(initialFrameRef.current);
        initialFrameRef.current = null;
      }
      if (poiDebounceRef.current) window.clearTimeout(poiDebounceRef.current);
      poiDebounceRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      visibilityObserverRef.current?.disconnect();
      visibilityObserverRef.current = null;
      mapVisibleRef.current = false;
      const mountedMap = mapRef.current;
      if (mountedMap) {
        mountedMap.off("moveend", loadPoisForViewport);
        mountedMap.stop();
        mountedMap.remove();
      }
      markersRef.current = [];
      activityMarkersRef.current = [];
      activityLinesRef.current = [];
      poiMarkersRef.current = [];
      userLocationMarkerRef.current = null;
      userLocationAccuracyRef.current = null;
      userLocationRef.current = null;
      routeLinesRef.current = [];
      lastRouteSignatureRef.current = null;
      mapRef.current = null;
      LRef.current = null;
    };
    // drawMarkersAndRoute/loadPoisForViewport read everything through refs
    // (stopsRef, showPoisRef, etc.), so they're effectively stable across
    // renders — this effect only needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawMarkersAndRoute();
    // Camera and marker inputs are mirrored into refs above; rebuilding this
    // callback on every render would restart route drawing unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stops,
    showRoute,
    viewportKey,
    activeStopId,
    stopColors,
    markerLabels,
    excludeFromRouteIds,
    activityPins,
    desktopLeftInset,
  ]);

  useEffect(() => {
    markerFiltersRef.current = markerFilters;
    drawMarkersAndRoute({ redrawRoute: false });
    // Marker visibility is read through a ref so changing it does not rebuild
    // the Leaflet map or affect the saved itinerary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerFilters]);

  const navigationPoints = navigationPointsForCurrentFilter();

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-muted" />
      <div
        className="absolute left-3 top-3 z-[1000] lg:left-[calc(var(--map-left-inset)+1rem)]"
        style={
          {
            "--map-left-inset": `${desktopLeftInset}px`,
          } as CSSProperties
        }
      >
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          className={`relative grid size-11 place-items-center rounded-[12px] border bg-[#FFFCF6] shadow-[0_4px_14px_rgba(22,19,13,0.2)] transition hover:bg-white ${
            filtersOpen
              ? "border-[#E4562A] text-[#E4562A]"
              : "border-[#D8CEB8] text-[#4F493D]"
          }`}
          aria-label="Map filters"
          aria-expanded={filtersOpen}
          title="Map filters"
        >
          <SlidersHorizontal className="size-5" />
          {(!markerFilters.stops || !markerFilters.activities) && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full border border-white bg-[#E4562A]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => openInGoogleMaps(navigationPoints)}
          disabled={navigationPoints.length < 2}
          className="mt-2 grid size-11 place-items-center rounded-[12px] border border-[#D8CEB8] bg-[#16130D] text-white shadow-[0_4px_14px_rgba(22,19,13,0.2)] transition hover:bg-[#2A251B] disabled:cursor-not-allowed disabled:bg-[#A89F88] disabled:opacity-60"
          aria-label="Open filtered route in Google Maps"
          title="Open filtered route in Google Maps"
        >
          <Navigation className="size-5" />
        </button>

        {filtersOpen && (
          <div
            className="absolute left-0 top-14 w-[min(280px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-[#D8CEB8] bg-[#FBF8F1] p-2 shadow-[0_16px_40px_rgba(22,19,13,0.22)]"
            role="dialog"
            aria-label="Map marker filters"
          >
            <div className="px-3 pb-2 pt-2">
              <div className="font-['Bricolage_Grotesque'] text-base font-extrabold text-[#16130D]">
                Map view
              </div>
              <div className="mt-0.5 text-xs text-[#7A7264]">
                Choose which trip markers are visible.
              </div>
            </div>
            <div className="space-y-1">
              {MARKER_FILTER_OPTIONS.map((option) => {
                const selected = markerFilters[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setMarkerFilters((current) => ({
                        ...current,
                        [option.key]: !current[option.key],
                      }));
                    }}
                    role="checkbox"
                    aria-checked={selected}
                    className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition ${
                      selected
                        ? "bg-[#FBE7DD] text-[#B8431F]"
                        : "text-[#4F493D] hover:bg-[#F1EBDE]"
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-[7px] border ${
                        selected
                          ? "border-[#E4562A] bg-[#E4562A] text-white"
                          : "border-[#D8CEB8] bg-white text-transparent"
                      }`}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {option.label}
                      </span>
                      <span className="block text-[11px] text-[#7A7264]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={focusUserLocation}
        disabled={!hasUserLocation}
        className="absolute bottom-8 right-3 z-[1000] grid size-11 place-items-center rounded-[12px] border border-[#D8CEB8] bg-[#FFFCF6] text-[#2563EB] shadow-[0_4px_14px_rgba(22,19,13,0.2)] transition hover:bg-white disabled:cursor-not-allowed disabled:text-[#A89F88] disabled:opacity-60 sm:bottom-9 sm:right-4"
        aria-label="Center map on your location"
        title={
          hasUserLocation
            ? "Center on your location"
            : "Waiting for location permission"
        }
      >
        <LocateFixed className="size-5" />
      </button>
    </div>
  );
}
