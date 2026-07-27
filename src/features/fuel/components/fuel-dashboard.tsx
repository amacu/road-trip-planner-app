"use client";

import type {
  TripPackingItemPlain,
  TripStayPlain,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import type { FuelPlan } from "@/features/fuel/lib/fuel-plan";
import { StaySummary } from "@/features/trip-stays/components/stay-summary";
import { PackingDashboard } from "@/features/trip-packing/components/packing-dashboard";
import type {
  TripPackingItemInput,
  TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";

const PRICE_TONES = [
  { tint: "#FBE7DD", ink: "#B8431F" },
  { tint: "#E8F0F6", ink: "#3f6a8c" },
  { tint: "#E1EFE7", ink: "#276848" },
  { tint: "#F0EADB", ink: "#5a5346" },
];

export function FuelDashboard({
  plan,
  vehicle,
  stays,
  packingItems,
  onCreatePackingItem,
  onUpdatePackingItem,
  onDeletePackingItem,
}: {
  plan: FuelPlan | null;
  vehicle: VehiclePlain;
  stays: TripStayPlain[];
  packingItems: TripPackingItemPlain[];
  onCreatePackingItem: (input: TripPackingItemInput) => Promise<boolean>;
  onUpdatePackingItem: (
    itemId: string,
    input: TripPackingItemUpdateInput,
  ) => Promise<boolean>;
  onDeletePackingItem: (itemId: string) => Promise<boolean>;
}) {
  const totalDistance = plan?.totalDistance ?? 0;
  const fuelCost = plan ? `${plan.totalCost} PLN` : "—";
  const fuelVolume = plan ? `~ ${Math.round(plan.totalUsage)} L` : "—";
  const tankFills =
    plan && vehicle.tankCapacity > 0
      ? `~ ${(plan.totalUsage / vehicle.tankCapacity).toFixed(1)}`
      : "—";
  const fuelPriceRows = buildFuelPriceRows(plan);

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

        <StaySummary stays={stays} />

        <div className="grid gap-[18px] lg:grid-cols-2">
          <section className="rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6">
            <h2 className="m-0 mb-1 font-['Bricolage_Grotesque'] text-lg font-bold tracking-[-0.02em]">
              This trip&apos;s fuel
            </h2>
            <div className="mb-[22px] text-[13px] font-medium text-[#8a8270]">
              {vehicle.name} · {vehicle.fuelType} ·{" "}
              {totalDistance > 0
                ? `${Math.round(totalDistance).toLocaleString("pl-PL")} km`
                : "route pending"}
            </div>

            <div className="mb-[22px] flex items-end gap-5">
              <div>
                <div className="font-['JetBrains_Mono'] text-[40px] font-bold leading-none tracking-[-0.03em] text-[#E4562A]">
                  {fuelCost}
                </div>
                <div className="mt-[5px] text-xs font-semibold text-[#948b76]">
                  total fuel cost
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 pb-1">
                <FuelLine label="Volume" value={fuelVolume} />
                <FuelLine
                  label="Avg use"
                  value={`${vehicle.consumption} L/100km`}
                />
                <FuelLine label="Tank fills" value={tankFills} />
              </div>
            </div>

            <div className="flex h-3 overflow-hidden rounded-full bg-[#EBE4D3]">
              <div className="w-[46%] bg-[#E4562A]" />
              <div className="w-[34%] bg-[#f0834f]" />
              <div className="w-[20%] bg-[#f6b48c]" />
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] font-semibold text-[#7a7264]">
              <Legend color="#E4562A" label="Coast Hwy" />
              <Legend color="#f0834f" label="Freeway" />
              <Legend color="#f6b48c" label="City" />
            </div>
          </section>

          <section className="rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6">
            <div className="mb-[18px] flex items-center justify-between gap-4">
              <h2 className="m-0 font-['Bricolage_Grotesque'] text-lg font-bold tracking-[-0.02em]">
                Fuel prices
              </h2>
              <span className="text-xs font-semibold text-[#8a8270]">
                {vehicle.fuelType} · per L
              </span>
            </div>

            <div>
              {fuelPriceRows.length > 0 ? (
                fuelPriceRows.map((price) => (
                  <div
                    key={price.code}
                    className="flex items-center gap-[13px] border-b border-[#EFE8D8] py-[11px]"
                  >
                    <div
                      className="grid size-[30px] place-items-center rounded-lg font-['JetBrains_Mono'] text-[11px] font-bold"
                      style={{ background: price.tint, color: price.ink }}
                    >
                      {price.code}
                    </div>
                    <div className="flex-1 text-sm font-semibold">
                      {price.country}
                    </div>
                    <div className="font-['JetBrains_Mono'] text-sm font-bold">
                      {price.price}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[13px] border border-dashed border-[#E7DFCE] px-4 py-5 text-center text-[12.5px] font-semibold text-[#8a8270]">
                  Add country names to route stops to show fuel prices.
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-[11px] rounded-[13px] bg-[#E1EFE7] p-[13px]">
              <span className="grid size-[30px] place-items-center rounded-[9px] bg-[#2E7A57] font-['JetBrains_Mono'] text-[13px] font-bold text-white">
                $
              </span>
              <div className="text-[12.5px] font-semibold leading-[1.35] text-[#276848]">
                Prices auto-update by country as you cross borders on the route.
              </div>
            </div>
          </section>
        </div>

        <PackingDashboard
          items={packingItems}
          onCreate={onCreatePackingItem}
          onUpdate={onUpdatePackingItem}
          onDelete={onDeletePackingItem}
        />
      </div>
    </div>
  );
}

function FuelLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12.5px]">
      <span className="font-medium text-[#7a7264]">{label}</span>
      <span className="font-['JetBrains_Mono'] font-semibold">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function buildFuelPriceRows(plan: FuelPlan | null) {
  if (!plan || plan.timelineSegments.length === 0) {
    return [];
  }

  const countries = new Map<
    string,
    { code: string; country: string; pricePln: number }
  >();

  for (const segment of plan.timelineSegments) {
    if (!countries.has(segment.code)) {
      countries.set(segment.code, {
        code: segment.code,
        country: segment.country,
        pricePln: segment.pricePln,
      });
    }
  }

  const rows = [...countries.values()].map((entry, index) => ({
    code: entry.code,
    country: entry.country,
    price: `${entry.pricePln.toFixed(2)} PLN`,
    ...PRICE_TONES[index % PRICE_TONES.length],
  }));

  return rows;
}
