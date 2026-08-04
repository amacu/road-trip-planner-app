"use client";

import {
  BedDouble,
  Check,
  Luggage,
  MapPin,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type {
  TripPackingItemPlain,
  TripStayPlain,
} from "@/features/trips/lib/trip-view-model";
import { AppLogo } from "@/components/shared/app-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  tripId,
  tripName,
  trips,
  heroImageUrl,
  dayCount,
  onLogoClick,
  tripContext,
  onAiPackingImport,
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
  tripId: string;
  tripName: string;
  trips: Array<{ id: string; name: string }>;
  heroImageUrl?: string | null;
  dayCount: number;
  onLogoClick: () => void;
  tripContext: string;
  onAiPackingImport: (
    items: TripPackingItemInput[],
    categories: Array<{ name: string; color: string }>,
    replaceExisting: boolean,
    allowNewCategories: boolean,
  ) => Promise<boolean>;
}) {
  const router = useRouter();
  const shoppingItems = packingItems.filter(
    (item) => item.acquisition === "buy",
  );
  const ownedItems = packingItems.filter((item) => item.acquisition !== "buy");
  const purchasedCount = shoppingItems.filter(
    (item) => item.isPurchased,
  ).length;
  const packedCount = ownedItems.filter((item) => item.isPacked).length;
  const expectedStays = Math.max(dayCount - 1, 0);
  const completedSteps =
    Math.min(stays.length, expectedStays) + purchasedCount + packedCount;
  const totalSteps = expectedStays + shoppingItems.length + ownedItems.length;
  const readiness = totalSteps
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  return (
    <div className="min-h-full w-full max-w-full overflow-x-clip bg-[#FFFCF6] text-[#16130D]">
      <header className="sticky top-0 z-20 flex min-h-[calc(68px+env(safe-area-inset-top))] items-center gap-3 border-b border-[#E4DBC8] bg-[#FBF8F1]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_8px_22px_-18px_rgba(22,19,13,0.55)] backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 rounded-[10px]"
          title="Open home"
          aria-label="Open home"
        >
          <AppLogo className="[&_img]:!h-9" />
        </button>
        <div className="flex min-w-0 flex-1 justify-end">
          <Select
            value={tripId}
            onValueChange={(nextTripId) => {
              if (nextTripId !== tripId) router.push(`/trips/${nextTripId}`);
            }}
          >
            <SelectTrigger
              aria-label="Switch trip"
              className="h-10 w-auto max-w-full gap-2 rounded-[12px] border-[#E2D8C6] bg-[#FFFCF6] px-3 text-[12px] font-black text-[#302B23] shadow-sm focus:ring-brand/30 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-[#9A917F]"
            >
              <MapPin className="size-3.5 shrink-0 text-brand" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center">
              {trips.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="px-2 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-2.5 md:px-5 md:pb-28 md:pt-5">
        <div className="mx-auto max-w-[1180px] animate-[rtUp_.5s_ease_both]">
          <section
            className="overflow-hidden rounded-[20px] bg-[#16130D] bg-cover bg-center p-5 text-[#FFF9EF] shadow-[0_18px_35px_rgba(22,19,13,0.16)] md:p-7"
            style={
              heroImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(16,14,10,.96) 0%, rgba(16,14,10,.83) 48%, rgba(16,14,10,.52) 100%), url(${JSON.stringify(heroImageUrl)})`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#BDB4A3]">
              <Sparkles className="size-3.5 text-brand" />
              Travel essentials
            </div>
            <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h1 className="font-['Bricolage_Grotesque'] text-[30px] font-extrabold leading-none tracking-[-0.035em] md:text-[42px]">
                  Ready for the road?
                </h1>
                <p className="mt-2 max-w-xl text-sm font-semibold text-[#CFC6B6]">
                  Keep nights, shopping and packing for {tripName} in one place.
                </p>
              </div>
              <div className="min-w-[180px] rounded-[14px] border border-white/10 bg-black/25 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-[#BDB4A3]">
                  Preparation
                  <span className="font-mono text-sm text-white">
                    {readiness}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-[3px] bg-white/15">
                  <div
                    className="h-full rounded-[3px] bg-[#70B990]"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4 md:gap-3">
            <TravelMetric
              icon={BedDouble}
              label="Nights"
              value={`${stays.length}/${expectedStays}`}
              tone="blue"
              complete={expectedStays === 0 || stays.length >= expectedStays}
            />
            <TravelMetric
              icon={ShoppingBag}
              label="Bought"
              value={`${purchasedCount}/${shoppingItems.length}`}
              tone="orange"
              complete={
                shoppingItems.length > 0 &&
                purchasedCount === shoppingItems.length
              }
            />
            <TravelMetric
              icon={Luggage}
              label="Packed"
              value={`${packedCount}/${ownedItems.length}`}
              tone="green"
              complete={
                ownedItems.length > 0 && packedCount === ownedItems.length
              }
            />
          </div>

          <div className="mt-6 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9A917F]">
                Accommodation
              </p>
              <h2 className="mt-1 font-['Bricolage_Grotesque'] text-[24px] font-bold tracking-[-0.025em]">
                Where you’ll sleep
              </h2>
            </div>
            <span className="hidden text-xs font-bold text-[#8A8270] sm:block">
              {stays.length} planned
            </span>
          </div>
          <div className="mt-3">
            <StaySummary
              stays={stays}
              onSave={onSaveStay}
              onDelete={onDeleteStay}
            />
          </div>

          <div className="mt-7 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9A917F]">
                Gear & supplies
              </p>
              <h2 className="mt-1 font-['Bricolage_Grotesque'] text-[24px] font-bold tracking-[-0.025em]">
                Bring everything you need
              </h2>
            </div>
            <span className="hidden text-xs font-bold text-[#8A8270] sm:block">
              {packingItems.length} items
            </span>
          </div>
          <PackingDashboard
            items={packingItems}
            categories={packingCategories}
            onCreate={onCreatePackingItem}
            onUpdate={onUpdatePackingItem}
            onDelete={onDeletePackingItem}
            onUpdateCategories={onUpdatePackingCategories}
            tripContext={tripContext}
            onAiImport={onAiPackingImport}
          />
        </div>
      </div>
    </div>
  );
}

function TravelMetric({
  icon: Icon,
  label,
  value,
  tone,
  complete,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
  tone: "blue" | "orange" | "green";
  complete: boolean;
}) {
  const colors = {
    blue: "bg-[#E8F0F6] text-[#456F8D]",
    orange: "bg-[#FBE7DD] text-[#B8431F]",
    green: "bg-[#E1EFE7] text-[#276848]",
  };
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[14px] border border-[#E7DFCE] bg-[#FBF8F1] p-2.5 shadow-sm md:gap-3 md:p-4">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-[10px] md:size-11 ${colors[tone]}`}
      >
        {complete ? (
          <Check className="size-4" strokeWidth={3} />
        ) : (
          <Icon className="size-4 md:size-[18px]" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-black uppercase tracking-[0.07em] text-[#8A8270]">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-sm font-black md:text-lg">
          {value}
        </span>
      </span>
    </div>
  );
}
