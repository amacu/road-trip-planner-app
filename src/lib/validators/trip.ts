import { z } from "zod";

const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid start date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return false;
    return date.toISOString().slice(0, 10) === value;
  }, "Choose a valid start date.");

export const tripCreateSchema = z.object({
  name: z.string().trim().min(1, "Trip name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  vehicleId: z.string().uuid().optional().nullable(),
  startDate: dateInputSchema.optional().or(z.literal("")),
});

export const tripUpdateSchema = tripCreateSchema.partial();

// "owner" is never stored on TripMember — it's implied by Trip.userId.
// Members can only ever be editor or viewer.
export const TRIP_MEMBER_ROLES = ["editor", "viewer"] as const;
export type TripMemberRole = (typeof TRIP_MEMBER_ROLES)[number];

export const tripMemberRoleUpdateSchema = z.object({
  role: z.enum(TRIP_MEMBER_ROLES),
});

export type TripCreateInput = z.infer<typeof tripCreateSchema>;
export type TripUpdateInput = z.infer<typeof tripUpdateSchema>;
