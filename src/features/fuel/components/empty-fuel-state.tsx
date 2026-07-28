import { Fuel } from "lucide-react";
import Link from "next/link";

import { StaySummary } from "@/features/trip-stays/components/stay-summary";
import { PackingDashboard } from "@/features/trip-packing/components/packing-dashboard";
import type {
  TripPackingItemPlain,
  TripStayPlain,
} from "@/features/trips/lib/trip-view-model";
import type {
  PackingCategory,
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";

export function EmptyFuelState({
  isOwner,
  stays,
  packingItems,
  packingCategories,
  onCreatePackingItem,
  onUpdatePackingItem,
  onDeletePackingItem,
  onUpdatePackingCategories,
}: {
  isOwner: boolean;
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
}) {
  return (
    <div className="min-h-full bg-[#fffaf0] p-5 pb-28 md:p-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-6">
          <div className="mb-1 text-xs font-bold uppercase tracking-[.1em] text-[#a89f88]">
            Travel
          </div>
          <h1 className="font-['Bricolage_Grotesque'] text-[38px] font-extrabold leading-none tracking-[-0.03em]">
            Trip essentials
          </h1>
        </div>
        <StaySummary stays={stays} />
        <div className="rounded-lg border-2 border-dashed border-border bg-white/60 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-muted text-brand">
            <Fuel className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold">
            {isOwner
              ? "Assign a vehicle to calculate fuel"
              : "No vehicle assigned to this trip"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOwner
              ? "Fuel estimates use the trip's assigned vehicle and prices from the fuel_prices table."
              : "Ask the trip owner to assign a vehicle in Trip settings to see fuel estimates."}
          </p>
          {isOwner && (
            <Link
              href="/profile"
              className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90"
            >
              Add a vehicle
            </Link>
          )}
        </div>
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
