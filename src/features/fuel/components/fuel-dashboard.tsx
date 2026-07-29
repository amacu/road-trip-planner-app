"use client";

import type {
  TripPackingItemPlain,
  TripStayPlain,
} from "@/features/trips/lib/trip-view-model";
import { LogoMark } from "@/components/shared/app-logo";
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
  tripName,
  dayCount,
  onLogoClick,
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
  tripName: string;
  dayCount: number;
  onLogoClick: () => void;
}) {
  return (
    <div className="min-h-full w-full max-w-full overflow-x-clip bg-[#fffaf0] text-[#16130D]">
      <header className="sticky top-0 z-20 flex min-h-[calc(76px+env(safe-area-inset-top))] items-center bg-[#FBF8F1] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_12px_28px_-22px_rgba(22,19,13,0.75)] md:hidden">
        <button
          type="button"
          onClick={onLogoClick}
          className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-brand shadow-[0_8px_20px_rgba(228,86,42,0.22)]"
          title="Open home"
          aria-label="Open home"
        >
          <LogoMark className="size-7" />
        </button>
        <div className="ml-2.5 min-w-0">
          <h1 className="truncate text-[18px] font-black leading-tight tracking-[-0.015em]">
            Travel
          </h1>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-[#8A7A68]">
            {tripName} · {dayCount} {dayCount === 1 ? "day" : "days"}
          </p>
        </div>
      </header>

      <div className="px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 md:px-10 md:pb-28 md:pt-8">
        <div className="mx-auto max-w-[1080px] animate-[rtUp_.5s_ease_both]">
          <div className="mb-4 hidden md:block md:mb-6">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#a89f88] md:mb-[7px] md:text-[12.5px]">
              Travel
            </div>
            <h1 className="m-0 font-['Bricolage_Grotesque'] text-[24px] font-extrabold leading-none tracking-[-0.025em] md:text-[38px] md:tracking-[-0.03em]">
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
    </div>
  );
}
