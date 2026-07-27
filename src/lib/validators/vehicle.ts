import { z } from "zod";

export const VEHICLE_TYPES = [
  "SUV",
  "Sedan",
  "Van",
  "Hatchback",
  "Wagon",
  "Truck",
] as const;

export const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"] as const;

export const vehicleCreateSchema = z.object({
  name: z.string().trim().min(1, "Vehicle name is required").max(80),
  type: z.enum(VEHICLE_TYPES).optional(),
  fuelType: z.enum(FUEL_TYPES),
  licensePlate: z.string().trim().max(20).optional().or(z.literal("")),
  fuelConsumptionLPer100km: z.coerce.number().min(0).max(100),
  tankCapacityL: z.coerce.number().min(0).max(1000),
  isDefault: z.boolean().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
