"use client";

import { Car } from "lucide-react";

import type { VehiclePlain } from "@/features/trips/lib/trip-view-model";
import { cn } from "@/lib/utils";

export function VehicleListItem({
  vehicle,
  active,
  onSelect,
}: {
  vehicle: VehiclePlain;
  active: boolean;
  onSelect: () => void;
}) {
  const unit = vehicle.fuelType === "Electric" ? "kWh/100 km" : "l/100 km";
  const capacityUnit = vehicle.fuelType === "Electric" ? "kWh" : "L";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border bg-[#fffaf0] p-4 text-left shadow-sm transition-all",
        active
          ? "border-brand shadow-[0_0_0_3px_var(--color-brand-muted)]"
          : "border-border hover:border-brand/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border",
          active
            ? "border-brand bg-brand text-brand-foreground"
            : "border-input",
        )}
      >
        {active && <CheckDot />}
      </span>
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
        <Car className={cn("size-7", active && "text-brand")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-black">{vehicle.name}</span>
          {vehicle.isDefault && (
            <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
              Default
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs font-medium text-muted-foreground">
          {vehicle.fuelType} <span className="px-1">·</span> {vehicle.type}
        </span>
        <span className="mt-1 block text-xs font-semibold text-foreground/70">
          {vehicle.consumption} {unit} <span className="px-1">·</span>{" "}
          {vehicle.tankCapacity} {capacityUnit}
        </span>
      </span>
    </button>
  );
}

function CheckDot() {
  return (
    <svg
      className="size-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}
