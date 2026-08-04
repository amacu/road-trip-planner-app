"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Car,
  Check,
  Info,
  LogOut,
  Mail,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOutAction, updateProfileAction } from "@/features/auth/actions";
import type { VehiclePlain } from "@/features/trips/lib/trip-view-model";
import { createVehicleAction } from "@/features/vehicles/actions";
import { VehicleEditor } from "@/features/vehicles/components/vehicle-editor";
import { VehicleListItem } from "@/features/vehicles/components/vehicle-list-item";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validators/auth";

export function ProfileForm({
  user,
  vehicles,
}: {
  user: User;
  vehicles: VehiclePlain[];
}) {
  const router = useRouter();
  const metadata = user.user_metadata ?? {};
  const username = (metadata.username as string | undefined) ?? "";
  const avatarUrl = metadata.avatar_url as string | undefined;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username,
      language: (metadata.language as string | undefined) ?? "en",
      currency: (metadata.currency as string | undefined) ?? "USD",
    },
  });

  async function onSubmit(data: ProfileUpdateInput) {
    const result = await updateProfileAction(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile saved.");
    router.refresh();
  }

  const displayName = watch("username") || user.email || "Traveler";

  return (
    <div className="mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-8 md:py-12">
      <Link
        href="/trips"
        className="mb-7 inline-flex items-center gap-2 text-xs font-black text-[#71695C] transition hover:text-[#A93D1D]"
      >
        <ArrowLeft className="size-3.5" /> Back to all trips
      </Link>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="relative overflow-hidden rounded-[24px] bg-[#16130D] p-7 text-[#FFF9EF] shadow-[0_18px_45px_rgba(22,19,13,.14)]">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] bg-[length:20px_20px]" />
          <div className="relative">
            <Avatar className="size-20 border-2 border-white/15 bg-[#FBE7DD] shadow-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-[#FBE7DD] text-xl font-black text-brand">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[.13em] text-[#F17A54]">
              Your profile
            </p>
            <h1 className="mt-2 break-words font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-tight tracking-[-.035em]">
              {displayName}
            </h1>
            {username && (
              <p className="mt-1 text-sm font-semibold text-white/45">
                @{username}
              </p>
            )}
            <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-semibold text-white/55">
              <Mail className="size-3.5 shrink-0 text-[#F17A54]" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </aside>

        <section className="rounded-[24px] border border-[#DED3C0] bg-[#FFFCF6] p-6 shadow-[0_8px_28px_rgba(22,19,13,.06)] sm:p-8">
          <div className="flex items-start gap-3 border-b border-[#E7DFCE] pb-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#FBE7DD] text-brand">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold tracking-[-.03em]">
                Personal details
              </h2>
              <p className="mt-1 text-sm font-medium text-[#8A8270]">
                The basics visible across your shared trips.
              </p>
            </div>
          </div>

          <form className="mt-7" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  className="h-12 rounded-[12px] border-[#D8CEB8] bg-[#FFF9EF]"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={user.email ?? ""}
                  className="h-12 rounded-[12px] border-[#E7DFCE] bg-[#F1EBDD] text-[#8A8270]"
                  disabled
                />
                <p className="text-[11px] font-medium text-[#9A917F]">
                  Your email is managed by your login provider.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E7DFCE] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => signOutAction()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-xs font-black text-[#71695C] transition hover:bg-[#F3EDE1] hover:text-[#302B23]"
              >
                <LogOut className="size-4" /> Sign out
              </button>
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="h-11 rounded-[11px] bg-brand px-5 font-black text-white shadow-[0_7px_18px_rgba(228,86,42,.2)] hover:bg-[#CF4822]"
              >
                <Check className="size-4" />
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ProfileVehicles vehicles={vehicles} />
    </div>
  );
}

function ProfileVehicles({ vehicles }: { vehicles: VehiclePlain[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const selectedVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === selectedId) ??
      vehicles.find((vehicle) => vehicle.isDefault) ??
      vehicles[0],
    [selectedId, vehicles],
  );

  async function handleAddVehicle() {
    setCreating(true);
    try {
      const result = await createVehicleAction({
        name: "New vehicle",
        fuelType: "Petrol",
        fuelConsumptionLPer100km: 7,
        tankCapacityL: 50,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSelectedId(result.data.id);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#DED3C0] bg-[#FFFCF6] shadow-[0_8px_28px_rgba(22,19,13,.06)]">
      <div className="flex flex-col gap-4 border-b border-[#E7DFCE] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#E3F0E8] text-[#276848]">
            <Car className="size-5" />
          </span>
          <div>
            <h2 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold tracking-[-.03em]">
              Your vehicles
            </h2>
            <p className="mt-1 text-sm font-medium text-[#8A8270]">
              Used to calculate fuel range and trip costs.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleAddVehicle}
          disabled={creating}
          className="h-11 rounded-[11px] bg-[#276848] px-4 font-black text-white hover:bg-[#205A3E]"
        >
          <Plus className="size-4" />
          {creating ? "Adding..." : "Add vehicle"}
        </Button>
      </div>

      <div className="grid gap-5 p-6 sm:p-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          {vehicles.length > 0 ? (
            <div className="space-y-2.5">
              {vehicles.map((vehicle) => (
                <VehicleListItem
                  key={vehicle.id}
                  vehicle={vehicle}
                  active={vehicle.id === selectedVehicle?.id}
                  onSelect={() => setSelectedId(vehicle.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#CDBFA6] bg-[#F8F3E9] p-6 text-center">
              <Car className="mx-auto size-7 text-[#9A917F]" />
              <p className="mt-3 text-sm font-bold text-[#71695C]">
                No vehicle added yet
              </p>
              <button
                type="button"
                onClick={handleAddVehicle}
                disabled={creating}
                className="mt-3 text-xs font-black text-brand hover:underline"
              >
                Add your first vehicle
              </button>
            </div>
          )}
          {vehicles.length > 0 && (
            <div className="mt-4 flex gap-2.5 rounded-[14px] bg-[#F3EDE1] p-3.5 text-xs font-medium leading-relaxed text-[#71695C]">
              <Info className="mt-0.5 size-4 shrink-0 text-brand" />
              The default vehicle is used for fuel estimates.
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#E7DFCE] bg-[#FFF9EF]">
          {selectedVehicle ? (
            <VehicleEditor
              key={selectedVehicle.id}
              vehicle={selectedVehicle}
              onDeleted={() => {
                setSelectedId(null);
                router.refresh();
              }}
            />
          ) : (
            <div className="grid min-h-[260px] place-items-center p-8 text-center text-sm font-semibold text-[#8A8270]">
              Add a vehicle to configure fuel calculations.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "T";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ""}`.toUpperCase();
}
