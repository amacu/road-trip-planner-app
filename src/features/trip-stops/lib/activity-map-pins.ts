import type { StopPoint } from "@/features/trips/lib/trip-view-model";

export type MapActivityPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  label: string;
  parentStopId: string;
};

export function activityMapPinsForStops(stops: StopPoint[]): MapActivityPin[] {
  return stops.flatMap((stop, stopIndex) => [
    ...(stop.itemType === "activity" && stop.hasLocation
      ? [
          {
            id: stop.id,
            lat: stop.lat,
            lng: stop.lng,
            title: stop.name,
            label: `${stopIndex + 1}`,
            parentStopId: stop.id,
          },
        ]
      : []),
    ...stop.activities
      .filter((activity) => activity.lat !== 0 || activity.lng !== 0)
      .map((activity, activityIndex) => ({
        id: activity.id,
        lat: activity.lat,
        lng: activity.lng,
        title: activity.title,
        label: `${stopIndex + 1}.${activityIndex + 1}`,
        parentStopId: stop.id,
      })),
  ]);
}
