import { z } from "zod";

export const ACTIVITY_CATEGORIES = [
  "sightseeing",
  "food",
  "culture",
  "nature",
  "hiking",
  "shopping",
  "coffee",
  "other",
] as const;
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.")
  .or(z.literal(""));

export const tripActivityCreateSchema = z.object({
  title: z.string().trim().min(1, "Activity title is required").max(120),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  googleMapsUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  placeId: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  category: z.enum(ACTIVITY_CATEGORIES).optional(),
});

export const tripActivityUpdateSchema = tripActivityCreateSchema.partial();

export const reorderTripActivitiesSchema = z.object({
  stopId: z.string().uuid(),
  activityIds: z
    .array(z.string().uuid())
    .min(1)
    .max(500)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate activity IDs.",
    ),
});

export type TripActivityCreateInput = z.infer<typeof tripActivityCreateSchema>;
export type TripActivityUpdateInput = z.infer<typeof tripActivityUpdateSchema>;
