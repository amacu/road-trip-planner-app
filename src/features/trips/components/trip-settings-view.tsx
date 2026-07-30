"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarRange,
  Car,
  Copy,
  Loader2,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { duplicateTripAction } from "@/features/trips/actions";
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
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripUpdateInput>({
    resolver: zodResolver(tripUpdateSchema),
    defaultValues: {
      name: trip.name,
      description: trip.description ?? "",
      startDate: trip.startDate ?? "",
      dayCount: trip.dayCount,
    },
  });

  useEffect(() => {
    reset({
      name: trip.name,
      description: trip.description ?? "",
      startDate: trip.startDate ?? "",
      dayCount: trip.dayCount,
    });
  }, [
    reset,
    trip.dayCount,
    trip.description,
    trip.id,
    trip.name,
    trip.startDate,
  ]);

  async function onSubmit(data: TripUpdateInput) {
    if (
      data.dayCount !== undefined &&
      data.dayCount !== null &&
      trip.dayCount !== null &&
      data.dayCount < trip.dayCount &&
      !confirm(
        `Reduce this trip to ${data.dayCount} days? Days after that and all their stops will be deleted.`,
      )
    ) {
      return;
    }
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

  async function duplicateCurrentTrip() {
    if (isDuplicating) return;
    setIsDuplicating(true);
    const result = await duplicateTripAction(trip.id);
    if (!result.success) {
      setIsDuplicating(false);
      toast.error(result.error);
      return;
    }
    toast.success("Trip duplicated.");
    router.push(`/trips/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-2">
      <div className="px-1 pb-1">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#16130D] text-white shadow-[0_8px_20px_rgba(22,19,13,0.2)]">
            <Settings2 className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand">
              Trip controls
            </p>
            <h2 className="font-['Bricolage_Grotesque'] text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-[#16130D]">
              Make this trip yours
            </h2>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-[13px] font-medium leading-relaxed text-[#7A7264]">
          Update the essentials, choose the right car or create a fresh copy of
          the complete plan.
        </p>
      </div>

      <TripCoverPhotoField tripId={trip.id} heroImageUrl={trip.heroImageUrl} />

      <section className="relative overflow-hidden rounded-[22px] border border-[#DED3C0] bg-[#FBF8F1] p-5 shadow-[0_8px_24px_rgba(22,19,13,0.06)] sm:p-6">
        <span className="absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-brand" />
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#FBE7DD] text-brand">
            <CalendarRange className="size-[18px]" />
          </span>
          <div>
            <h3 className="font-['Bricolage_Grotesque'] text-[18px] font-extrabold tracking-[-0.015em] text-[#16130D]">
              Trip details
            </h3>
            <p className="mt-0.5 text-[12px] font-medium text-[#948B76]">
              Name, dates and the number of days in your plan.
            </p>
          </div>
        </div>
        <form className="mt-5" onSubmit={handleSubmit(onSubmit)}>
          <TripFormFields
            idPrefix="trip-settings"
            register={register}
            errors={errors}
            layout="settings"
          />
          <div className="mt-5 flex justify-end border-t border-[#E7DFCE] pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-[12px] bg-brand px-5 font-black text-brand-foreground shadow-[0_8px_18px_rgba(228,86,42,0.2)] hover:bg-[#CF4822]"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="relative overflow-hidden rounded-[22px] border border-[#C9D8D0] bg-[#EDF5EF] p-5 shadow-[0_8px_24px_rgba(46,122,87,0.06)]">
          <span className="absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[#2E7A57]" />
          <span className="grid size-10 place-items-center rounded-[13px] bg-[#D9ECDF] text-[#256647]">
            <Car className="size-[18px]" />
          </span>
          <h3 className="mt-4 font-['Bricolage_Grotesque'] text-[17px] font-extrabold text-[#1E4F39]">
            Trip vehicle
          </h3>
          <p className="mt-1 min-h-9 text-[12px] font-medium leading-relaxed text-[#648071]">
            Shared fuel estimates use this vehicle.
          </p>

          {isOwner ? (
            vehicles.length > 0 ? (
              <Select
                value={trip.vehicle?.id ?? "none"}
                onValueChange={onVehicleChange}
              >
                <SelectTrigger className="mt-4 h-11 rounded-[12px] border-[#A9C9B7] bg-white/80 font-bold shadow-none">
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
              <p className="mt-4 rounded-[12px] border border-dashed border-[#A9C9B7] bg-white/45 p-3 text-xs font-semibold text-[#648071]">
                Add a vehicle in your profile to assign it here.
              </p>
            )
          ) : trip.vehicle ? (
            <p className="mt-4 rounded-[12px] bg-white/65 p-3 text-sm font-bold text-[#256647]">
              {trip.vehicle.name} · {trip.vehicle.consumption} L/100km
            </p>
          ) : (
            <p className="mt-4 rounded-[12px] border border-dashed border-[#A9C9B7] bg-white/45 p-3 text-xs font-semibold text-[#648071]">
              Only the trip owner can assign a vehicle.
            </p>
          )}
        </section>

        <section className="relative overflow-hidden rounded-[22px] border border-[#D8CDE8] bg-[#F3EFF8] p-5 shadow-[0_8px_24px_rgba(124,92,191,0.06)]">
          <span className="absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[#7C5CBF]" />
          <span className="grid size-10 place-items-center rounded-[13px] bg-[#E8E0F3] text-[#6C4FA8]">
            <Copy className="size-[18px]" />
          </span>
          <h3 className="mt-4 font-['Bricolage_Grotesque'] text-[17px] font-extrabold text-[#4F397D]">
            Duplicate trip
          </h3>
          <p className="mt-1 min-h-9 text-[12px] font-medium leading-relaxed text-[#776893]">
            Copy the complete plan without participants.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={duplicateCurrentTrip}
            disabled={isDuplicating}
            className="mt-4 h-11 w-full rounded-[12px] border-[#BCA9DF] bg-white/70 font-black text-[#6C4FA8] shadow-none hover:bg-white hover:text-[#5B4094]"
          >
            {isDuplicating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            {isDuplicating ? "Duplicating..." : "Create copy"}
          </Button>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-[22px] border border-[#E7C1B5] bg-[#FFF5F1] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#FBE2DA] text-[#B8431F]">
            <ShieldAlert className="size-[18px]" />
          </span>
          <div>
            <h3 className="font-['Bricolage_Grotesque'] text-[16px] font-extrabold text-[#8F351B]">
              Delete this trip
            </h3>
            <p className="mt-1 max-w-md text-[12px] font-medium leading-relaxed text-[#9A6657]">
              Permanently removes every day, stop, night and activity.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          className="h-10 shrink-0 rounded-[11px] border-[#E3A692] bg-white/70 px-4 font-black text-[#B8431F] shadow-none hover:bg-[#FBE2DA] hover:text-[#9C3215]"
        >
          <Trash2 className="size-4" />
          Delete trip
        </Button>
      </section>
    </div>
  );
}
