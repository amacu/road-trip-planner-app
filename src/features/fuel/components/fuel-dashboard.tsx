"use client";

import type {
  TripPackingItemPlain,
  TripStayPlain,
} from "@/features/trips/lib/trip-view-model";
import { StaySummary } from "@/features/trip-stays/components/stay-summary";
import { PackingDashboard } from "@/features/trip-packing/components/packing-dashboard";
import type {
  PackingCategory,
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";
import type { TripStayInput } from "@/lib/validators/trip-stay";

export function FuelDashboard({
  stays,
  packingItems,
  packingCategories,
  onCreatePackingItem,
  onUpdatePackingItem,
  onDeletePackingItem,
  onUpdatePackingCategories,
  onSaveStay,
  onDeleteStay,
}: {
  stays: TripStayPlain[];
  packingItems: TripPackingItemPlain[];
  packingCategories: PackingCategory[];
  onCreatePackingItem: (input: TripPackingItemInput) => Promise<boolean>;
  onUpdatePackingItem: (
    itemId: string,
    input: TripPackingItemUpdateInput,
  ) => Promise<boolean>;
  onDeletePackingItem: (itemId: string) => Promise<boolean>;
  onUpdatePackingCategories: (
    categories: PackingCategory[],
  ) => Promise<boolean>;
  onSaveStay: (input: TripStayInput) => Promise<boolean>;
  onDeleteStay: (stayId: string) => Promise<void>;
}) {
  return (
    <div className="min-h-full bg-[#fffaf0] px-5 pb-28 pt-8 text-[#16130D] md:px-10">
      <div className="mx-auto max-w-[1080px] animate-[rtUp_.5s_ease_both]">
        <div className="mb-6">
          <div className="mb-[7px] text-[12.5px] font-bold uppercase tracking-[.1em] text-[#a89f88]">
            Travel
          </div>
          <h1 className="m-0 font-['Bricolage_Grotesque'] text-[38px] font-extrabold leading-none tracking-[-0.03em]">
            Trip essentials
          </h1>
        </div>

        <StaySummary
          stays={stays}
          onSave={onSaveStay}
          onDelete={onDeleteStay}
        />

        <PackingDashboard
          items={packingItems}
          categories={packingCategories}
          onCreate={onCreatePackingItem}
          onUpdate={onUpdatePackingItem}
          onDelete={onDeletePackingItem}
          onUpdateCategories={onUpdatePackingCategories}
        />
      </div>
    </div>
  );
}
