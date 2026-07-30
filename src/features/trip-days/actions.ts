"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  createTripDay,
  deleteTripDay,
  reorderTripDays,
  updateTripDay,
} from "@/lib/db/trip-days";
import {
  toTripDayPlain,
  toTripDaySummaryPlain,
  toTripStayPlain,
  type TripDayPlain,
  type TripDaySummaryPlain,
  type TripStayPlain,
} from "@/features/trips/lib/trip-view-model";
import { tripAccessWhere } from "@/lib/db/trip-access";
import { prisma } from "@/lib/prisma";
import {
  reorderTripDaysSchema,
  tripDayCreateSchema,
  tripDayUpdateSchema,
} from "@/lib/validators/trip-day";

export async function createTripDayAction(
  tripId: string,
  input: unknown,
): Promise<
  ActionResult<TripDaySummaryPlain & { carryOverStopId: string | null }>
> {
  const user = await requireAuthenticatedUser();
  const parsed = tripDayCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid day data.",
    };
  }

  const created = await createTripDay(tripId, user.id, parsed.data);
  if (!created) {
    return { success: false, error: "Trip not found." };
  }

  return {
    success: true,
    data: {
      ...toTripDaySummaryPlain(created.day),
      carryOverStopId: created.carryOverStopId,
    },
  };
}

export async function updateTripDayAction(
  tripId: string,
  dayId: string,
  input: unknown,
): Promise<ActionResult<TripDaySummaryPlain>> {
  const user = await requireUser();
  const parsed = tripDayUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid day data.",
    };
  }

  const day = await updateTripDay(dayId, user.id, parsed.data);
  if (!day) {
    return { success: false, error: "Day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toTripDaySummaryPlain(day) };
}

export async function deleteTripDayAction(
  tripId: string,
  dayId: string,
): Promise<ActionResult<{ replacementDay: TripDaySummaryPlain | null }>> {
  const user = await requireUser();
  const deleted = await deleteTripDay(dayId, user.id);
  if (!deleted) {
    return { success: false, error: "Day not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return {
    success: true,
    data: {
      replacementDay: deleted.replacementDay
        ? toTripDaySummaryPlain(deleted.replacementDay)
        : null,
    },
  };
}

export async function reorderTripDaysAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderTripDaysSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order.",
    };
  }

  const reordered = await reorderTripDays(tripId, user.id, parsed.data.dayIds);
  if (!reordered) {
    return { success: false, error: "Trip not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function getTripDaySnapshotAction(
  tripId: string,
  dayId: string,
): Promise<
  ActionResult<{
    day: TripDayPlain;
    stays: TripStayPlain[];
    stayDayIds: string[];
  }>
> {
  const user = await requireAuthenticatedUser();
  const day = await prisma.tripDay.findFirst({
    where: {
      id: dayId,
      tripId,
      trip: tripAccessWhere(user.id),
    },
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
        include: {
          activities: { orderBy: { activityOrder: "asc" } },
        },
      },
    },
  });
  if (!day) return { success: false, error: "Day not found." };

  const previousDay = await prisma.tripDay.findFirst({
    where: { tripId, dayNumber: day.dayNumber - 1 },
    select: { id: true },
  });
  const stayDayIds = [day.id, previousDay?.id].filter((id): id is string =>
    Boolean(id),
  );
  const stays = await prisma.tripStay.findMany({
    where: { tripId, afterDayId: { in: stayDayIds } },
  });

  return {
    success: true,
    data: {
      day: toTripDayPlain(day),
      stays: stays.map(toTripStayPlain),
      stayDayIds,
    },
  };
}
