"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  addTripMember,
  canWriteTrip,
  createTrip,
  deleteTrip,
  getTripSwitcherItems,
  getTripById,
  removeTripMember,
  updateTrip,
  updateTripMemberRole,
} from "@/lib/db/trips";
import { findUserProfileByIdentifier } from "@/lib/db/user-profiles";
import {
  toTripSummaryPlain,
  type TripSummaryPlain,
} from "@/features/trips/lib/trip-view-model";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  tripCreateSchema,
  tripMemberRoleUpdateSchema,
  tripUpdateSchema,
} from "@/lib/validators/trip";

const HERO_IMAGE_BUCKET = "trip-hero-images";
const MAX_HERO_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_HERO_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const HERO_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const tripMemberCreateSchema = z.object({
  identifier: z.string().trim().min(1, "Enter an email or username."),
});

export async function getMyTripsAction() {
  const user = await requireAuthenticatedUser();
  return getTripSwitcherItems(user.id);
}

export async function getMyTripAction(tripId: string) {
  const user = await requireAuthenticatedUser();
  return getTripById(tripId, user.id);
}

export async function createTripAction(
  input: unknown,
): Promise<ActionResult<TripSummaryPlain>> {
  const user = await requireUser();
  const parsed = tripCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid trip data.",
    };
  }

  const trip = await createTrip(user.id, parsed.data);
  revalidatePath("/");
  return { success: true, data: toTripSummaryPlain(trip) };
}

export async function updateTripAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<TripSummaryPlain>> {
  const user = await requireUser();
  const parsed = tripUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid trip data.",
    };
  }

  const trip = await updateTrip(tripId, user.id, parsed.data);
  if (!trip) {
    return { success: false, error: "Trip not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toTripSummaryPlain(trip) };
}

export async function uploadTripHeroImageAction(
  tripId: string,
  formData: FormData,
): Promise<ActionResult<TripSummaryPlain>> {
  const user = await requireUser();

  if (!(await canWriteTrip(tripId, user.id))) {
    return { success: false, error: "Trip not found." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No image provided." };
  }
  if (!ALLOWED_HERO_IMAGE_TYPES.has(file.type)) {
    return { success: false, error: "Use a JPEG, PNG, WEBP, or GIF image." };
  }
  if (file.size > MAX_HERO_IMAGE_BYTES) {
    return { success: false, error: "Image must be under 8MB." };
  }

  const supabase = await getSupabaseServerClient();
  const extension = HERO_IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: "Unsupported image type." };
  }
  const path = `${user.id}/${tripId}/hero-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(HERO_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Trip hero upload failed:", uploadError.message);
    return { success: false, error: "Could not upload the image." };
  }

  const { data: publicUrlData } = supabase.storage
    .from(HERO_IMAGE_BUCKET)
    .getPublicUrl(path);

  const trip = await updateTrip(tripId, user.id, {
    heroImageUrl: publicUrlData.publicUrl,
  });
  if (!trip) {
    await supabase.storage.from(HERO_IMAGE_BUCKET).remove([path]);
    return { success: false, error: "Trip not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: toTripSummaryPlain(trip) };
}

export async function deleteTripAction(tripId: string): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteTrip(tripId, user.id);
  if (!deleted) {
    return { success: false, error: "Trip not found." };
  }

  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function addTripMemberAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = tripMemberCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid user ID.",
    };
  }

  try {
    const profile = await findUserProfileByIdentifier(parsed.data.identifier);
    if (!profile) {
      return { success: false, error: "User not found in the app." };
    }

    const member = await addTripMember(tripId, user.id, profile.userId);
    if (!member) {
      return { success: false, error: "Trip not found." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not add member.",
    };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function removeTripMemberAction(
  tripId: string,
  memberId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await removeTripMember(tripId, user.id, memberId);
  if (!removed) {
    return { success: false, error: "Collaborator not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}

export async function updateTripMemberRoleAction(
  tripId: string,
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = tripMemberRoleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role.",
    };
  }

  const updated = await updateTripMemberRole(
    tripId,
    user.id,
    memberId,
    parsed.data.role,
  );
  if (!updated) {
    return { success: false, error: "Collaborator not found." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: undefined };
}
