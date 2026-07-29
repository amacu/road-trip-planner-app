import { z } from "zod";

export const STOP_TYPES = ["stop", "activity"] as const;

export const TRAVEL_MODES = ["driving", "walking"] as const;
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.")
  .or(z.literal(""));

export const tripStopCreateSchema = z.object({
  name: z.string().trim().min(1, "Stop name is required").max(120),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  placeId: z.string().trim().max(300).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  stopType: z.enum(STOP_TYPES).default("stop"),
  travelMode: z.enum(TRAVEL_MODES).default("driving"),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  category: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(6000).nullable().optional(),
  visitDurationMin: z.number().int().min(0).max(1440).nullable().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const tripStopUpdateSchema = tripStopCreateSchema.partial();

export const reorderTripStopsSchema = z.object({
  dayId: z.string().uuid(),
  stopIds: z
    .array(z.string().uuid())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate stop IDs."),
});

export const aiDayStopsImportSchema = z.object({
  replaceExisting: z.boolean(),
  dayNotesMarkdown: z.string().trim().max(6000),
  dayStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid day start time."),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        address: z.string().trim().max(300),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        countryCode: z.string().trim().length(2).toUpperCase().nullable(),
        itemType: z.enum(STOP_TYPES),
        travelMode: z.enum(TRAVEL_MODES),
        description: z.string().trim().max(6000),
        visitDurationMin: z.number().int().min(15).max(720),
      }),
    )
    .min(1)
    .max(20),
});

export type TripStopCreateInput = z.infer<typeof tripStopCreateSchema>;
export type TripStopUpdateInput = z.infer<typeof tripStopUpdateSchema>;
export type AiDayStopsImportInput = z.infer<typeof aiDayStopsImportSchema>;
