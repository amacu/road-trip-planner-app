import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.")
  .or(z.literal(""));
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine(
    (value) =>
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value,
    "Choose a valid date.",
  )
  .or(z.literal(""));

export const tripDayCreateSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
  date: dateSchema.optional(),
  startTime: timeSchema.optional(),
});

export const tripDayUpdateSchema = tripDayCreateSchema.partial().extend({
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const reorderTripDaysSchema = z.object({
  dayIds: z
    .array(z.string().uuid())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate day IDs."),
});

export type TripDayCreateInput = z.infer<typeof tripDayCreateSchema>;
export type TripDayUpdateInput = z.infer<typeof tripDayUpdateSchema>;
