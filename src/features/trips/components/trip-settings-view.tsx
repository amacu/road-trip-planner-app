"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Car } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripCoverPhotoField } from "@/features/trips/components/trip-cover-photo-field";
import { TripFormFields } from "@/features/trips/components/trip-form-fields";
import type {
  TripPlain,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import { tripUpdateSchema, type TripUpdateInput } from "@/lib/validators/trip";

export function TripSettingsPanel({
  trip,
  vehicles,
  isOwner,
  onSave,
  onDelete,
}: {
  trip: TripPlain;
  vehicles: VehiclePlain[];
  isOwner: boolean;
  onSave: (patch: TripUpdateInput) => Promise<void>;
  onDelete: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TripUpdateInput>({
    resolver: zodResolver(tripUpdateSchema),
    defaultValues: {
      name: trip.name,
      description: trip.description ?? "",
      startDate: trip.startDate ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: trip.name,
      description: trip.description ?? "",
      startDate: trip.startDate ?? "",
    });
  }, [reset, trip.description, trip.id, trip.name, trip.startDate]);

  async function onSubmit(data: TripUpdateInput) {
    try {
      await onSave(data);
      reset(data);
      toast.success("Trip updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save trip.",
      );
    }
  }

  async function onVehicleChange(vehicleId: string) {
    try {
      await onSave({ vehicleId: vehicleId === "none" ? null : vehicleId });
      toast.success("Vehicle updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update vehicle.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <TripCoverPhotoField tripId={trip.id} heroImageUrl={trip.heroImageUrl} />

      <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black tracking-tight">Trip details</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <TripFormFields idPrefix="trip-settings" register={register} />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand font-semibold text-brand-foreground hover:bg-brand/90"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
          <Car className="size-5 text-muted-foreground" />
          Vehicle
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used to estimate fuel cost for everyone on this trip.
        </p>

        {isOwner ? (
          vehicles.length > 0 ? (
            <Select
              value={trip.vehicle?.id ?? "none"}
              onValueChange={onVehicleChange}
            >
              <SelectTrigger className="mt-4 bg-white">
                <SelectValue placeholder="No vehicle assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} · {vehicle.consumption} L/100km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              You don&apos;t have any vehicles yet. Add one from your profile to
              assign it here.
            </p>
          )
        ) : trip.vehicle ? (
          <p className="mt-4 text-sm font-semibold">
            {trip.vehicle.name} · {trip.vehicle.consumption} L/100km
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No vehicle assigned yet. Only the trip owner can assign one.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-destructive/25 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-destructive">
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a trip removes all its days, stops, and activities. This
          cannot be undone.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          className="mt-4 border-destructive/25 text-destructive hover:bg-destructive/10"
        >
          Delete trip
        </Button>
      </div>
    </div>
  );
}
