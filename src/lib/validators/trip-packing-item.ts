import { z } from "zod";

export const PACKING_ACQUISITIONS = [
  "have",
  "buy",
  "borrow",
  "rent",
  "decide",
] as const;

export const PACKING_CATEGORIES = [
  "Clothing",
  "Kitchen & food",
  "Sleeping",
  "Car",
  "Electronics",
  "Hygiene",
  "Health",
  "Documents",
  "Other",
] as const;

const packingItemBaseSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name.").max(120),
  category: z.string().trim().min(1).max(60),
  acquisition: z.enum(PACKING_ACQUISITIONS).default("have"),
  quantity: z.number().int().min(1).max(999).default(1),
  notes: z.string().trim().max(500).nullable().optional(),
  isPacked: z.boolean().default(false),
  itemOrder: z.number().int().min(0).optional(),
});

export const tripPackingItemSchema = packingItemBaseSchema;
export const tripPackingItemUpdateSchema = packingItemBaseSchema.partial();

export type TripPackingItemInput = z.infer<typeof tripPackingItemSchema>;
export type TripPackingItemUpdateInput = z.infer<
  typeof tripPackingItemUpdateSchema
>;
