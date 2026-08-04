import type {
  TripDayWithStops,
  TripStopRecord,
  TripWithRelations,
} from "@/types/trip";
import type { Vehicle } from "@prisma/client";
import {
  DEFAULT_PACKING_CATEGORIES,
  packingCategoriesSchema,
  productLinksSchema,
  type PackingCategory,
  type ProductLink,
} from "@/lib/validators/trip-packing-item";

/**
 * Plain, JSON-serializable mirrors of the Prisma models above. Server
 * Components must convert to these before passing data into Client
 * Components — Prisma's `Decimal` and `Date` objects cannot cross that
 * boundary (Next.js "Only plain objects can be passed..." error).
 */

export type StopPoint = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasLocation: boolean;
  countryCode: string | null;
  itemType: "stop" | "activity";
  travelMode: "driving" | "walking";
  startTime: string | null;
  endTime: string | null;
  category: string | null;
  description: string | null;
  visitDurationMin: number | null;
  notes: string | null;
  activities: TripActivityPlain[];
};

export type TripActivityPlain = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  googleMapsUrl: string | null;
  placeId: string | null;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  category: string;
};

export function toTripActivityPlain(
  activity: TripStopRecord["activities"][number],
): TripActivityPlain {
  return {
    id: activity.id,
    title: activity.title,
    address: activity.address ?? "",
    lat: activity.latitude ? activity.latitude.toNumber() : 0,
    lng: activity.longitude ? activity.longitude.toNumber() : 0,
    googleMapsUrl: activity.googleMapsUrl,
    placeId: activity.placeId,
    description: activity.description,
    startTime: activity.startTime,
    endTime: activity.endTime,
    category: activity.category,
  };
}

export function toStopPoint(stop: TripStopRecord): StopPoint {
  return {
    id: stop.id,
    name: stop.name,
    address: stop.address ?? "",
    lat: stop.latitude ? stop.latitude.toNumber() : 0,
    lng: stop.longitude ? stop.longitude.toNumber() : 0,
    hasLocation: stop.latitude !== null && stop.longitude !== null,
    countryCode: stop.countryCode,
    itemType: stop.stopType === "activity" ? "activity" : "stop",
    travelMode: stop.travelMode === "walking" ? "walking" : "driving",
    startTime: stop.startTime,
    endTime: stop.endTime,
    category: stop.category,
    description: stop.description,
    visitDurationMin: stop.visitDurationMin,
    notes: stop.notes,
    activities: stop.activities.map(toTripActivityPlain),
  };
}

export type TripDayPlain = {
  id: string;
  dayNumber: number;
  date: string | null;
  name: string | null;
  notes: string | null;
  startTime: string | null;
  stops: StopPoint[];
};

export function toTripDayPlain(day: TripDayWithStops): TripDayPlain {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date ? day.date.toISOString().slice(0, 10) : null,
    name: day.name,
    notes: day.notes,
    startTime: day.startTime,
    stops: day.stops.map(toStopPoint),
  };
}

export type VehiclePlain = {
  id: string;
  name: string;
  type: string | null;
  fuelType: string;
  licensePlate: string | null;
  isDefault: boolean;
  consumption: number;
  tankCapacity: number;
};

export type TripMemberPlain = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  role: string;
  createdAt: string;
};

export function toTripMemberPlain(
  member: TripWithRelations["members"][number],
): TripMemberPlain {
  return {
    id: member.id,
    userId: member.userId,
    email: member.user?.email ?? null,
    username: member.user?.username ?? null,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

export type UserProfilePlain = {
  userId: string;
  email: string;
  username: string | null;
};

export function toUserProfilePlain(profile: {
  userId: string;
  email: string;
  username: string | null;
}): UserProfilePlain {
  return {
    userId: profile.userId,
    email: profile.email,
    username: profile.username,
  };
}

export function toVehiclePlain(vehicle: Vehicle): VehiclePlain {
  return {
    id: vehicle.id,
    name: vehicle.name,
    type: vehicle.type,
    fuelType: vehicle.fuelType,
    licensePlate: vehicle.licensePlate,
    isDefault: vehicle.isDefault,
    consumption: vehicle.fuelConsumptionLPer100km.toNumber(),
    tankCapacity: vehicle.tankCapacityL.toNumber(),
  };
}

export type TripPlain = {
  id: string;
  ownerId: string;
  ownerProfile: UserProfilePlain | null;
  name: string;
  description: string | null;
  startDate: string | null;
  dayCount: number | null;
  heroImageUrl: string | null;
  vehicle: VehiclePlain | null;
  members: TripMemberPlain[];
  days: TripDayPlain[];
  stays: TripStayPlain[];
  packingItems: TripPackingItemPlain[];
  packingCategories: PackingCategory[];
};

export type TripPackingItemPlain = {
  id: string;
  name: string;
  category: string;
  acquisition: string;
  quantity: number;
  notes: string | null;
  price: number | null;
  productLinks: ProductLink[];
  isPurchased: boolean;
  isPacked: boolean;
  itemOrder: number;
};

export type TripStayPlain = {
  id: string;
  afterDayId: string;
  name: string;
  stayType: string;
  status: string;
  address: string;
  lat: number | null;
  lng: number | null;
  countryCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  price: number | null;
  currency: string;
  bookingUrl: string | null;
  confirmation: string | null;
  notes: string | null;
};

export function toTripStayPlain(stay: {
  id: string;
  afterDayId: string;
  name: string;
  stayType: string;
  status: string;
  address: string | null;
  latitude: { toNumber(): number } | null;
  longitude: { toNumber(): number } | null;
  countryCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  price: { toNumber(): number } | null;
  currency: string;
  bookingUrl: string | null;
  confirmation: string | null;
  notes: string | null;
}): TripStayPlain {
  return {
    id: stay.id,
    afterDayId: stay.afterDayId,
    name: stay.name,
    stayType: stay.stayType,
    status: stay.status,
    address: stay.address ?? "",
    lat: stay.latitude?.toNumber() ?? null,
    lng: stay.longitude?.toNumber() ?? null,
    countryCode: stay.countryCode,
    checkInTime: stay.checkInTime,
    checkOutTime: stay.checkOutTime,
    price: stay.price?.toNumber() ?? null,
    currency: stay.currency,
    bookingUrl: stay.bookingUrl,
    confirmation: stay.confirmation,
    notes: stay.notes,
  };
}

export function toTripPlain(trip: TripWithRelations): TripPlain {
  return {
    id: trip.id,
    ownerId: trip.userId,
    ownerProfile: null,
    name: trip.name,
    description: trip.description,
    startDate: trip.startDate
      ? trip.startDate.toISOString().slice(0, 10)
      : null,
    dayCount: trip.dayCount,
    heroImageUrl: trip.heroImageUrl,
    vehicle: trip.vehicle ? toVehiclePlain(trip.vehicle) : null,
    members: trip.members.map(toTripMemberPlain),
    days: trip.days.map(toTripDayPlain),
    stays: trip.stays.map(toTripStayPlain),
    packingItems: trip.packingItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      acquisition: item.acquisition,
      quantity: item.quantity,
      notes: item.notes,
      price: item.price?.toNumber() ?? null,
      productLinks: normalizeProductLinks(item.productLinks),
      isPurchased: item.isPurchased,
      isPacked: item.isPacked,
      itemOrder: item.itemOrder,
    })),
    packingCategories: normalizePackingCategories(trip.packingCategories),
  };
}

function normalizePackingCategories(value: unknown): PackingCategory[] {
  const parsed = packingCategoriesSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : DEFAULT_PACKING_CATEGORIES.map((category) => ({ ...category }));
}

function normalizeProductLinks(value: unknown): ProductLink[] {
  const parsed = productLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/**
 * Minimal serializable shape for Server Action responses that don't need
 * the full trip tree (the caller just needs the id/name and then calls
 * router.refresh() to re-fetch fresh data through the page's own
 * toTripPlain() conversion). Never return a raw Prisma Trip/Vehicle/etc.
 * from a "use server" action — the whole return value must serialize
 * across the action boundary the same way Server Component props do.
 */
export type TripSummaryPlain = {
  id: string;
  name: string;
  heroImageUrl: string | null;
};

export function toTripSummaryPlain(trip: {
  id: string;
  name: string;
  heroImageUrl?: string | null;
}): TripSummaryPlain {
  return {
    id: trip.id,
    name: trip.name,
    heroImageUrl: trip.heroImageUrl ?? null,
  };
}

export type TripDaySummaryPlain = {
  id: string;
  dayNumber: number;
  name: string | null;
};

export function toTripDaySummaryPlain(day: {
  id: string;
  dayNumber: number;
  name: string | null;
}): TripDaySummaryPlain {
  return { id: day.id, dayNumber: day.dayNumber, name: day.name };
}

export type TripStopSummaryPlain = {
  id: string;
  name: string;
};

export function toTripStopSummaryPlain(stop: {
  id: string;
  name: string;
}): TripStopSummaryPlain {
  return { id: stop.id, name: stop.name };
}
