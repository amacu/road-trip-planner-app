"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import { Car, Info, LogOut, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { signOutAction, updateProfileAction } from "@/features/auth/actions";
import { UserAvatar } from "@/features/profile/components/user-avatar";
import type { VehiclePlain } from "@/features/trips/lib/trip-view-model";
import { createVehicleAction } from "@/features/vehicles/actions";
import { VehicleEditor } from "@/features/vehicles/components/vehicle-editor";
import { VehicleListItem } from "@/features/vehicles/components/vehicle-list-item";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validators/auth";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polish" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "PLN", label: "PLN - Polish Zloty" },
  { value: "GBP", label: "GBP - British Pound" },
];

export function ProfileForm({
  user,
  vehicles,
}: {
  user: User;
  vehicles: VehiclePlain[];
}) {
  const router = useRouter();
  const metadata = user.user_metadata ?? {};
  const provider =
    user.app_metadata.provider === "google"
      ? "Google"
      : user.app_metadata.provider === "email"
        ? "Email"
        : (user.app_metadata.provider ?? "Email");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: (metadata.full_name as string | undefined) ?? "",
      username: (metadata.username as string | undefined) ?? "",
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

    toast.success("Profile changes saved.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[22px] bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-['Bricolage_Grotesque'] text-xl font-bold tracking-[-0.02em]">
              Personal information
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground">
              Update the details used across your trips.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <UserAvatar
                fullName={watch("fullName")}
                email={user.email}
                avatarUrl={metadata.avatar_url as string | undefined}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-full-name">Full name</Label>
                  <Input
                    id="profile-full-name"
                    className="h-11 rounded-xl bg-[#fffaf0]"
                    {...register("fullName")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-username">Username</Label>
                  <Input
                    id="profile-username"
                    className="h-11 rounded-xl bg-[#fffaf0]"
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-xs font-medium text-destructive">
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
                    className="h-11 rounded-xl bg-muted/60"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={watch("language")}
                    onValueChange={(v) =>
                      setValue("language", v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#fffaf0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(v) =>
                      setValue("currency", v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#fffaf0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="h-11 rounded-xl bg-brand font-bold text-brand-foreground hover:bg-brand/90 sm:w-auto"
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl font-bold"
                    onClick={() => signOutAction()}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-destructive/30 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled
                    title="Account deletion is not enabled yet."
                  >
                    <Trash2 className="size-4" />
                    Delete account
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[22px] bg-card shadow-sm xl:sticky xl:top-0">
          <CardHeader>
            <CardTitle className="font-['Bricolage_Grotesque'] text-xl font-bold tracking-[-0.02em]">
              Account
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground">
              Login and security details.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountRow
              label="Account created"
              value={formatDate(user.created_at)}
            />
            <AccountRow label="Login provider" value={provider} />
            <AccountRow
              label="Email verified"
              value={user.email_confirmed_at ? "Yes" : "No"}
            />
            <AccountRow
              label="Last login"
              value={formatDate(user.last_sign_in_at)}
            />
          </CardContent>
        </Card>
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
      vehicles.find((v) => v.id === selectedId) ??
      vehicles.find((v) => v.isDefault) ??
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
    <Card className="rounded-[22px] bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="font-['Bricolage_Grotesque'] text-xl font-bold tracking-[-0.02em]">
            Vehicles
          </CardTitle>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Manage your vehicles and fuel consumption.
          </p>
        </div>
        <Button
          onClick={handleAddVehicle}
          disabled={creating}
          className="h-11 w-full gap-2 rounded-xl bg-brand px-4 font-bold text-brand-foreground shadow-sm hover:bg-brand/90 sm:w-auto"
        >
          <Plus className="size-4" />
          {creating ? "Adding..." : "Add vehicle"}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col">
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleListItem
                key={vehicle.id}
                vehicle={vehicle}
                active={vehicle.id === selectedVehicle?.id}
                onSelect={() => setSelectedId(vehicle.id)}
              />
            ))}
          </div>

          {vehicles.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-brand" />
                <p>
                  The default vehicle is used for trip fuel estimates and fleet
                  totals.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-[18px] border border-border bg-[#fffaf0] shadow-sm">
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
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-brand-muted text-brand">
                <Car className="size-7" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                Add your first vehicle to start tracking consumption.
              </p>
              <Button
                onClick={handleAddVehicle}
                disabled={creating}
                className="rounded-xl bg-brand px-4 py-2 font-bold text-brand-foreground hover:bg-brand/90"
              >
                Add vehicle
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}
