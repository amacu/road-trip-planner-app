"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Trash2 } from "lucide-react";
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
    watch,
    formState: { isSubmitting, isDirty },
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
    <form className="p-5 md:p-7" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-black tracking-tight">{vehicle.name}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleSetDefault}
            disabled={vehicle.isDefault}
            className="h-10 rounded-lg font-bold text-muted-foreground disabled:opacity-45"
          >
            <Star className="size-4" />
            Set as default
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="h-10 rounded-lg border-destructive/25 font-bold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-8 py-6">
        <section>
          <h3 className="text-lg font-black tracking-tight">
            Basic information
          </h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Name">
              <Input
                className="h-11 rounded-lg bg-white font-semibold"
                {...register("name")}
              />
            </Field>
            <Field label="Type">
              <NativeSelect
                value={watch("type") ?? ""}
                options={VEHICLE_TYPES}
                onChange={(v) =>
                  reset(
                    { ...watch(), type: v as VehicleUpdateInput["type"] },
                    { keepDirty: true },
                  )
                }
              />
            </Field>
            <Field label="Fuel type">
              <NativeSelect
                value={fuelType ?? ""}
                options={FUEL_TYPES}
                onChange={(v) =>
                  reset(
                    {
                      ...watch(),
                      fuelType: v as VehicleUpdateInput["fuelType"],
                    },
                    { keepDirty: true },
                  )
                }
              />
            </Field>
            <Field label="License plate (optional)">
              <Input
                className="h-11 rounded-lg bg-white font-semibold"
                {...register("licensePlate")}
              />
            </Field>
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <h3 className="text-lg font-black tracking-tight">
            Fuel consumption
          </h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field
              label={
                fuelType === "Electric"
                  ? "Consumption (kWh/100 km)"
                  : "Consumption (l/100 km)"
              }
            >
              <Input
                type="number"
                min="0"
                step="0.1"
                className="h-11 rounded-lg bg-white font-semibold"
                {...register("fuelConsumptionLPer100km", {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field
              label={
                fuelType === "Electric"
                  ? "Battery capacity (kWh)"
                  : "Fuel tank capacity (L)"
              }
            >
              <Input
                type="number"
                min="0"
                step="1"
                className="h-11 rounded-lg bg-white font-semibold"
                {...register("tankCapacityL", { valueAsNumber: true })}
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="h-11 rounded-lg bg-brand px-6 font-bold text-brand-foreground hover:bg-brand/90"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function NativeSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full rounded-lg bg-white font-semibold">
        <SelectValue />
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
