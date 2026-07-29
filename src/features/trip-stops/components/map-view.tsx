"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline,
} from "leaflet";

import {
  fetchDrivingRoute,
  straightRouteForStops,
  walkingRouteForStops,
} from "@/lib/integrations/routing";
import { fetchPois } from "@/lib/poi-client";
import type { PoiCategory, PoiResult } from "@/lib/integrations/poi";
import type { StopPoint } from "@/features/trips/lib/trip-view-model";

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

export type MapActivityPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
};

// Below this zoom level the visible area is too large for a POI query to
// stay both fast and uncluttered (Overpass would return thousands of
// nodes) — matches roughly "a town/neighborhood is on screen".
const POI_MIN_ZOOM = 14;
const POI_FETCH_DEBOUNCE_MS = 400;

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
  /** Stable identity of the route currently shown (for example a day id). Changing it re-fits the camera without reacting to ordinary stop edits. */
  viewportKey?: string;
  activeStopId?: string;
  onStopMove?: (id: string, lat: number, lng: number) => void;
  /** Optional per-stop marker color (e.g. one color per day) keyed by stop id, overriding the default active/inactive coloring. */
  stopColors?: Record<string, string>;
  /** Optional marker text keyed by stop id, used to keep map numbering aligned with the route list. */
  markerLabels?: Record<string, string>;
  /** Stop ids to exclude from the connecting route line while keeping their markers visible. */
  excludeFromRouteIds?: ReadonlySet<string>;
  /** Extra pins shown alongside stops — e.g. the active stop's activities. Only drawn while activeStopId is set. */
  activityPins?: MapActivityPin[];
  /** When true, nearby points of interest (restaurants, attractions, fuel, lodging, cafes) load automatically once the user zooms in far enough, like Google Maps. */
  showPois?: boolean;
  /** Called when a user clicks a POI marker's "add" action — lets callers add it as a stop. */
  onAddPoi?: (poi: PoiResult) => void;
  /** Marker ids that participate in routing but must not be draggable (for example overnight stay anchors). */
  nonDraggableIds?: ReadonlySet<string>;
};

export function MapView({
  stops,
  viewportKey,
  activeStopId,
  onStopMove,
  stopColors,
  markerLabels,
  excludeFromRouteIds,
  activityPins,
  showPois,
  onAddPoi,
  nonDraggableIds,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const activityMarkersRef = useRef<LeafletMarker[]>([]);
  const poiMarkersRef = useRef<LeafletMarker[]>([]);
  const lineRef = useRef<Polyline | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onStopMoveRef = useRef(onStopMove);
  const onAddPoiRef = useRef(onAddPoi);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initialFrameRef = useRef<number | null>(null);
  const routeRequestRef = useRef<AbortController | null>(null);
  const poiRequestRef = useRef<AbortController | null>(null);
  const poiDebounceRef = useRef<number | null>(null);
  // Always reflects the latest props, readable from inside the async
  // Leaflet-init callback below (which captures stale closures otherwise).
  const stopsRef = useRef(stops);
  const activeStopIdRef = useRef(activeStopId);
  const stopColorsRef = useRef(stopColors);
  const markerLabelsRef = useRef(markerLabels);
  const excludeFromRouteIdsRef = useRef(excludeFromRouteIds);
  const nonDraggableIdsRef = useRef(nonDraggableIds);
  const activityPinsRef = useRef(activityPins);
  const showPoisRef = useRef(showPois);
  const viewportKeyRef = useRef(viewportKey);
  // Tracks the activeStopId that was in effect the last time we moved the
  // viewport, so we only re-fit/refocus when the *selection* changes — not
  // on every unrelated re-render (e.g. a stop's name being edited).
  const lastFocusedStopIdRef = useRef<string | undefined>(undefined);
  const lastViewportKeyRef = useRef<string | undefined>(undefined);
  const hasFittedOnceRef = useRef(false);

  useEffect(() => {
    onStopMoveRef.current = onStopMove;
  }, [onStopMove]);

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
    viewportKeyRef.current = viewportKey;
    activeStopIdRef.current = activeStopId;
    stopColorsRef.current = stopColors;
    markerLabelsRef.current = markerLabels;
    excludeFromRouteIdsRef.current = excludeFromRouteIds;
    nonDraggableIdsRef.current = nonDraggableIds;
    activityPinsRef.current = activityPins;
  }, [
    stops,
    viewportKey,
    activeStopId,
    stopColors,
    markerLabels,
    excludeFromRouteIds,
    nonDraggableIds,
    activityPins,
  ]);

  function drawMarkersAndRoute() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const currentStops = stopsRef.current;
    const currentViewportKey = viewportKeyRef.current;
    const currentActiveStopId = activeStopIdRef.current;
    const currentStopColors = stopColorsRef.current;
    const currentMarkerLabels = markerLabelsRef.current;
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
      const marker = L.marker([stop.lat, stop.lng], {
        icon,
        draggable:
          !!onStopMoveRef.current && !nonDraggableIdsRef.current?.has(stop.id),
      })
        .addTo(map)
        .bindTooltip(
          `${isStay ? "Overnight · " : isOvernightEnd ? "" : `${escapeHtml(markerLabel)}. `}${escapeHtml(stop.name)}`,
          {
            direction: "top",
            offset: [0, -28],
          },
        );
      marker.on("dragend", (e) => {
        const ll = (e.target as LeafletMarker).getLatLng();
        onStopMoveRef.current?.(stop.id, ll.lat, ll.lng);
      });
      markersRef.current.push(marker);
    });

    activityMarkersRef.current.forEach((m) => m.remove());
    activityMarkersRef.current = [];

    const currentActivityPins =
      currentActiveStopId && activityPinsRef.current
        ? activityPinsRef.current
        : [];

    currentActivityPins.forEach((pin) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: white;
          color: var(--color-brand);
          width: 22px; height: 22px;
          border-radius: 50%;
          border: 2.5px solid var(--color-brand);
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
        "><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindTooltip(escapeHtml(pin.title), {
          direction: "top",
          offset: [0, -16],
        });
      activityMarkersRef.current.push(marker);
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
      const focusPoints: Array<[number, number]> = [
        [activeStop.lat, activeStop.lng],
        ...currentActivityPins.map((p) => [p.lat, p.lng] as [number, number]),
      ];
      if (focusPoints.length > 1) {
        map.fitBounds(L.latLngBounds(focusPoints), {
          padding: [80, 80],
          maxZoom: 16,
        });
      } else {
        map.setView([activeStop.lat, activeStop.lng], 15, { animate: false });
      }
    } else if (shouldFit && currentStops.length === 1) {
      map.setView([currentStops[0].lat, currentStops[0].lng], 14, {
        animate: false,
      });
    } else if (shouldFit && currentStops.length > 1) {
      const bounds = L.latLngBounds(
        currentStops.map((s) => [s.lat, s.lng] as [number, number]),
      );
      map.fitBounds(bounds, {
        paddingTopLeft: [56, 92],
        paddingBottomRight: [56, 112],
        maxZoom: 14,
        animate: true,
        duration: 0.45,
      });
    }

    lineRef.current?.remove();
    lineRef.current = null;

    if (routeStops.length < 2) return;

    const drawRoute = (
      latlngs: Array<[number, number]>,
      options?: { fallback?: boolean },
    ) => {
      lineRef.current?.remove();
      lineRef.current = L.polyline(latlngs, {
        color: "var(--color-brand)",
        weight: 5,
        opacity: options?.fallback ? 0.55 : 0.9,
        dashArray: options?.fallback ? "2 9" : undefined,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    };

    drawRoute(straightRouteForStops(routeStops), { fallback: true });

    routeRequestRef.current?.abort();
    const controller = new AbortController();
    routeRequestRef.current = controller;
    Promise.all(
      routeStops.slice(1).map((destination, index) => {
        const pair = [routeStops[index], destination];
        return destination.travelMode === "walking"
          ? Promise.resolve(walkingRouteForStops(pair))
          : fetchDrivingRoute(pair, controller.signal);
      }),
    )
      .then((routes) => {
        if (!controller.signal.aborted && routes.every(Boolean)) {
          drawRoute(
            routes.flatMap((route, index) =>
              index === 0 ? (route?.path ?? []) : (route?.path.slice(1) ?? []),
            ),
          );
        }
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
    if (!map || !showPoisRef.current) return;

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
          !containerRef.current?.isConnected
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
          !containerRef.current?.isConnected
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
      if (initialFrameRef.current !== null) {
        cancelAnimationFrame(initialFrameRef.current);
        initialFrameRef.current = null;
      }
      if (poiDebounceRef.current) window.clearTimeout(poiDebounceRef.current);
      poiDebounceRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      const mountedMap = mapRef.current;
      if (mountedMap) {
        mountedMap.off("moveend", loadPoisForViewport);
        mountedMap.stop();
        mountedMap.remove();
      }
      markersRef.current = [];
      activityMarkersRef.current = [];
      poiMarkersRef.current = [];
      lineRef.current = null;
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
  }, [
    stops,
    viewportKey,
    activeStopId,
    stopColors,
    markerLabels,
    excludeFromRouteIds,
    activityPins,
  ]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-muted" />
    </div>
  );
}
