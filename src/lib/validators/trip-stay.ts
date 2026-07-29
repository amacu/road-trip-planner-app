import { z } from "zod";

export const STAY_TYPES = [
  "hotel",
  "tent",
  "car",
  "driving_overnight",
] as const;

export const STAY_STATUSES = ["planned", "booked", "paid"] as const;

const tripStayBaseSchema = z.object({
  afterDayId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  stayType: z.enum(STAY_TYPES),
  status: z.enum(STAY_STATUSES).default("planned"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  price: z.number().min(0).max(1_000_000).nullable().optional(),
  currency: z.string().trim().length(3).toUpperCase().default("PLN"),
  bookingUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  confirmation: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(6000).nullable().optional(),
});

export const tripStaySchema = tripStayBaseSchema;

export const tripStayUpdateSchema = tripStayBaseSchema.partial().omit({
  afterDayId: true,
});

export type TripStayInput = z.infer<typeof tripStaySchema>;
export type TripStayUpdateInput = z.infer<typeof tripStayUpdateSchema>;
