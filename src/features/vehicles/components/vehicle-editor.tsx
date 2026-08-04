"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, Check, Fuel, Gauge, Star, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteVehicleAction,
  setDefaultVehicleAction,
  updateVehicleAction,
} from "@/features/vehicles/actions";
import type { VehiclePlain } from "@/features/trips/lib/trip-view-model";
import {
  FUEL_TYPES,
  VEHICLE_TYPES,
  vehicleUpdateSchema,
  type VehicleUpdateInput,
} from "@/lib/validators/vehicle";

export function VehicleEditor({
  vehicle,
  onDeleted,
}: {
  vehicle: VehiclePlain;
  onDeleted: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<VehicleUpdateInput>({
    resolver: zodResolver(vehicleUpdateSchema),
    values: {
      name: vehicle.name,
      type: (vehicle.type as VehicleUpdateInput["type"]) ?? undefined,
      fuelType: vehicle.fuelType as VehicleUpdateInput["fuelType"],
      licensePlate: vehicle.licensePlate ?? "",
      fuelConsumptionLPer100km: vehicle.consumption,
      tankCapacityL: vehicle.tankCapacity,
    },
  });

  useEffect(() => {
    reset(undefined, { keepValues: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const fuelType = watch("fuelType");

  async function onSubmit(data: VehicleUpdateInput) {
    const result = await updateVehicleAction(vehicle.id, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Vehicle updated.");
  }

  async function handleSetDefault() {
    const result = await setDefaultVehicleAction(vehicle.id);
    if (!result.success) toast.error(result.error);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${vehicle.name}"?`)) return;
    const result = await deleteVehicleAction(vehicle.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDeleted();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="relative overflow-hidden border-b border-[#E7DFCE] bg-[#F7F0E4] px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-[#70B990]/15 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#213E31] text-[#8ED0AA] shadow-[0_8px_20px_rgba(33,62,49,.18)]">
            <CarFront className="size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-['Bricolage_Grotesque'] text-xl font-extrabold tracking-[-.025em] text-[#211D17]">
                {vehicle.name}
              </h3>
              {vehicle.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F0E8] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.08em] text-[#276848]">
                  <Check className="size-3" /> Default
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-semibold text-[#8A8270]">
              {vehicle.type || "Vehicle"} · {vehicle.fuelType}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <section>
          <SectionTitle
            icon={CarFront}
            title="Vehicle details"
            description="How this car appears in your trips."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle name" error={errors.name?.message}>
              <Input
                placeholder="e.g. Family Volvo"
                className="h-12 rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] font-semibold shadow-none focus-visible:ring-brand/25"
                {...register("name")}
              />
            </Field>
            <Field label="Type">
              <NativeSelect
                value={watch("type") ?? ""}
                options={VEHICLE_TYPES}
                placeholder="Choose a type"
                onChange={(value) =>
                  setValue("type", value as VehicleUpdateInput["type"], {
                    shouldDirty: true,
                  })
                }
              />
            </Field>
            <Field label="Fuel type">
              <NativeSelect
                value={fuelType ?? ""}
                options={FUEL_TYPES}
                placeholder="Choose fuel"
                onChange={(value) =>
                  setValue(
                    "fuelType",
                    value as VehicleUpdateInput["fuelType"],
                    { shouldDirty: true },
                  )
                }
              />
            </Field>
            <Field
              label="License plate"
              hint="Optional"
              error={errors.licensePlate?.message}
            >
              <Input
                placeholder="e.g. WA 12345"
                className="h-12 rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] font-mono font-bold uppercase shadow-none focus-visible:ring-brand/25"
                {...register("licensePlate")}
              />
            </Field>
          </div>
        </section>

        <section className="border-t border-[#E7DFCE] pt-7">
          <SectionTitle
            icon={Gauge}
            title="Fuel & range"
            description="Used for distance and cost estimates."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={
                fuelType === "Electric" ? "Energy use" : "Fuel consumption"
              }
              suffix={fuelType === "Electric" ? "kWh / 100 km" : "L / 100 km"}
              error={errors.fuelConsumptionLPer100km?.message}
            >
              <div className="relative">
                <Fuel className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-12 rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] pl-10 pr-24 font-mono font-bold shadow-none focus-visible:ring-brand/25"
                  {...register("fuelConsumptionLPer100km", {
                    valueAsNumber: true,
                  })}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#9A917F]">
                  {fuelType === "Electric" ? "kWh/100" : "L/100 km"}
                </span>
              </div>
            </Field>
            <Field
              label={
                fuelType === "Electric" ? "Battery capacity" : "Tank capacity"
              }
              suffix={fuelType === "Electric" ? "kWh" : "litres"}
              error={errors.tankCapacityL?.message}
            >
              <div className="relative">
                <Gauge className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A89F88]" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className="h-12 rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] pl-10 pr-16 font-mono font-bold shadow-none focus-visible:ring-brand/25"
                  {...register("tankCapacityL", { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#9A917F]">
                  {fuelType === "Electric" ? "kWh" : "L"}
                </span>
              </div>
            </Field>
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#E7DFCE] bg-[#FBF7EF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-3 text-xs font-black text-[#A54A3A] transition hover:bg-[#F8E5E0]"
        >
          <Trash2 className="size-3.5" /> Delete vehicle
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!vehicle.isDefault && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSetDefault}
              className="h-10 rounded-[10px] border-[#D8CEB8] bg-[#FFFCF6] px-4 text-xs font-black text-[#71695C] shadow-none hover:bg-[#F3EDE1]"
            >
              <Star className="size-3.5" /> Make default
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="h-10 rounded-[10px] bg-brand px-5 text-xs font-black text-white shadow-[0_6px_16px_rgba(228,86,42,.2)] hover:bg-[#CF4822]"
          >
            {isSubmitting ? "Saving..." : "Save vehicle"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  suffix,
  error,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  suffix?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-[#5F584C]">
        <span>{label}</span>
        {(hint || suffix) && (
          <span className="font-medium text-[#A89F88]">{hint || suffix}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-[11px] font-semibold text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CarFront;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#F3EDE1] text-[#A24D2C]">
        <Icon className="size-4" />
      </span>
      <div>
        <h4 className="text-sm font-black text-[#302B23]">{title}</h4>
        <p className="mt-0.5 text-[11px] font-medium text-[#9A917F]">
          {description}
        </p>
      </div>
    </div>
  );
}

function NativeSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 w-full rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] font-semibold shadow-none focus:ring-brand/25">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
