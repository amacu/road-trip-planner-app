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

const DEFAULT_CATEGORY_COLORS = [
  "#C44724",
  "#D88B2F",
  "#4D7D65",
  "#5E86A3",
  "#725184",
  "#B55F79",
  "#3F6A8C",
  "#8A7045",
  "#6A6353",
] as const;

export const DEFAULT_PACKING_CATEGORIES = PACKING_CATEGORIES.map(
  (name, index) => ({
    id: `default-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
    name,
    color: DEFAULT_CATEGORY_COLORS[index],
  }),
);

export const packingCategorySchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1, "Enter a category name.").max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Choose a valid color."),
});

export const packingCategoriesSchema = z
  .array(packingCategorySchema)
  .min(1, "Keep at least one category.")
  .max(30)
  .superRefine((categories, context) => {
    const names = new Set<string>();
    for (const category of categories) {
      const key = category.name.toLocaleLowerCase();
      if (names.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category names must be unique.",
        });
        return;
      }
      names.add(key);
    }
  });

export type PackingCategory = z.infer<typeof packingCategorySchema>;

export const productLinkSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(80),
  url: z
    .string()
    .trim()
    .url("Enter a valid product URL.")
    .max(2_000)
    .refine(
      (value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Enter a valid product URL." },
    ),
});

export const productLinksSchema = z.array(productLinkSchema).max(20);
export type ProductLink = z.infer<typeof productLinkSchema>;

const packingItemBaseSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name.").max(120),
  category: z.string().trim().min(1).max(60),
  acquisition: z.enum(PACKING_ACQUISITIONS).default("have"),
  quantity: z.number().int().min(1).max(999).default(1),
  notes: z.string().trim().max(500).nullable().optional(),
  price: z.number().min(0).max(1_000_000).nullable().optional(),
  productLinks: productLinksSchema.default([]),
  isPurchased: z.boolean().default(false),
  isPacked: z.boolean().default(false),
  itemOrder: z.number().int().min(0).optional(),
});

export const tripPackingItemSchema = packingItemBaseSchema;
export const tripPackingItemUpdateSchema = packingItemBaseSchema.partial();

export type TripPackingItemInput = z.infer<typeof tripPackingItemSchema>;
export type TripPackingItemUpdateInput = z.infer<
  typeof tripPackingItemUpdateSchema
>;
