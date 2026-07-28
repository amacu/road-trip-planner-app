"use client";

import { ChevronDown, Fuel } from "lucide-react";
import { useState } from "react";

import type { FuelPlan } from "@/features/fuel/lib/fuel-plan";
import type { VehiclePlain } from "@/features/trips/lib/trip-view-model";

const PRICE_TONES = [
  { tint: "#FBE7DD", ink: "#B8431F" },
  { tint: "#E8F0F6", ink: "#3f6a8c" },
  { tint: "#E1EFE7", ink: "#276848" },
  { tint: "#F0EADB", ink: "#5a5346" },
];

export function FuelOverviewCard({
  plan,
  vehicle,
}: {
  plan: FuelPlan | null;
  vehicle: VehiclePlain | null;
}) {
  const [pricesOpen, setPricesOpen] = useState(false);
  const priceRows = buildFuelPriceRows(plan);
  const fuelCost = plan ? `${plan.totalCost} PLN` : "—";
  const fuelVolume = plan ? `~${Math.round(plan.totalUsage)} L` : "—";
  const tankFills =
    plan && vehicle && vehicle.tankCapacity > 0
      ? `~${(plan.totalUsage / vehicle.tankCapacity).toFixed(1)}`
      : "—";

  return (
    <section className="rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-[11px] bg-[#FBE7DD] text-[#E4562A]">
              <Fuel className="size-4" />
            </span>
            <div>
              <h2 className="font-['Bricolage_Grotesque'] text-[19px] font-bold tracking-[-0.02em]">
                Trip fuel
              </h2>
              <p className="text-xs font-semibold text-[#8A8270]">
                {vehicle
                  ? `${vehicle.name} · ${vehicle.fuelType}`
                  : "Assign a vehicle to calculate fuel"}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-['JetBrains_Mono'] text-[28px] font-bold leading-none text-[#E4562A]">
            {fuelCost}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#A49B87]">
            estimated total
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <FuelMetric label="Distance" value={formatDistance(plan)} />
        <FuelMetric label="Volume" value={fuelVolume} />
        <FuelMetric label="Tank fills" value={tankFills} />
      </div>

      <button
        type="button"
        onClick={() => setPricesOpen((current) => !current)}
        aria-expanded={pricesOpen}
        className="mt-5 flex w-full items-center gap-3 border-t border-[#E9E0CF] pt-4 text-left"
      >
        <span className="font-['Bricolage_Grotesque'] text-sm font-bold">
          Fuel prices
        </span>
        <span className="text-xs font-semibold text-[#8A8270]">
          {priceRows.length
            ? `${priceRows.length} ${priceRows.length === 1 ? "country" : "countries"}`
            : "No route countries"}
        </span>
        <span className="h-px flex-1 bg-[#E9E0CF]" />
        <ChevronDown
          className={`size-4 text-[#8A8270] transition-transform ${
            pricesOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {pricesOpen && (
        <div className="mt-2">
          {priceRows.length ? (
            priceRows.map((price) => (
              <div
                key={price.code}
                className="flex items-center gap-3 border-b border-[#EFE8D8] py-2.5 last:border-0"
              >
                <span
                  className="grid size-8 place-items-center rounded-[9px] font-['JetBrains_Mono'] text-[10px] font-bold"
                  style={{ background: price.tint, color: price.ink }}
                >
                  {price.code}
                </span>
                <span className="flex-1 text-sm font-semibold">
                  {price.country}
                </span>
                <span className="font-['JetBrains_Mono'] text-sm font-bold">
                  {price.price}
                </span>
              </div>
            ))
          ) : (
            <p className="py-3 text-xs font-semibold text-[#8A8270]">
              Add countries to route stops to show current fuel prices.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function FuelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] bg-[#F3EDE1] px-3 py-2.5">
      <div className="text-[9px] font-extrabold uppercase tracking-[0.07em] text-[#8A8270]">
        {label}
      </div>
      <div className="mt-1 font-['JetBrains_Mono'] text-xs font-bold">
        {value}
      </div>
    </div>
  );
}

function formatDistance(plan: FuelPlan | null) {
  return plan && plan.totalDistance > 0
    ? `${Math.round(plan.totalDistance).toLocaleString("pl-PL")} km`
    : "—";
}

function buildFuelPriceRows(plan: FuelPlan | null) {
  if (!plan || plan.timelineSegments.length === 0) return [];

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

  return [...countries.values()].map((entry, index) => ({
    code: entry.code,
    country: entry.country,
    price: `${entry.pricePln.toFixed(2)} PLN/L`,
    ...PRICE_TONES[index % PRICE_TONES.length],
  }));
}
