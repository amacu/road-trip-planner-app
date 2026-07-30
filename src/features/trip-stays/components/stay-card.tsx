"use client";

import {
  BedDouble,
  CarFront,
  ChevronRight,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Route,
  TentTree,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import { PlainTimeInput } from "@/features/trip-stops/components/stop-card";
import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import { STAY_TYPES, type TripStayInput } from "@/lib/validators/trip-stay";

const STAY_OPTIONS = [
  ["hotel", "Hotel", BedDouble],
  ["tent", "Tent", TentTree],
  ["car", "Car", CarFront],
  ["driving_overnight", "Drive overnight", Route],
] as const;

const LABELS = Object.fromEntries(
  STAY_OPTIONS.map(([value, label]) => [value, label]),
) as Record<string, string>;

const DRIVING_OVERNIGHT_NAME = "Driving overnight";

function isAutomaticDrivingName(value: string) {
  return /^driv(?:e|es|ing) overnight$/i.test(value.trim());
}

export function StayCard({
  dayId,
  stay,
  previousStay,
  arrivalTime,
  onSave,
  onDelete,
}: {
  dayId: string;
  stay?: TripStayPlain;
  previousStay?: TripStayPlain;
  arrivalTime?: string | null;
  onSave: (input: TripStayInput) => Promise<boolean>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const stayOption = stay
    ? STAY_OPTIONS.find(([value]) => value === stay.stayType)
    : undefined;
  const StayIcon = stayOption?.[2] ?? BedDouble;

  return (
    <div className="space-y-2">
      {stay ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-full overflow-hidden rounded-[18px] border border-[#CDD3CF] bg-[#EDEFEA] px-3.5 py-3 text-left shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-[#9FADAE] hover:bg-[#E8ECE7] hover:shadow-[0_10px_24px_rgba(48,69,77,0.1)]"
        >
          <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[#5E86A3]" />
          <div className="flex items-center gap-3">
            <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-full bg-[#526F7D] text-[#F7FAF8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
              <StayIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="rounded-full bg-[#DDE6E6] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#496775]">
                  Night
                </span>
                <span className="truncate text-[10px] font-bold text-[#71858B]">
                  {LABELS[stay.stayType]}
                  {arrivalTime && stay.stayType !== "driving_overnight"
                    ? ` · Arrives ${arrivalTime}`
                    : ""}
                </span>
              </div>
              <div className="mt-1.5 truncate text-[15px] font-black leading-tight text-[#16130D]">
                {stay.name}
              </div>
              <div className="mt-1 truncate text-[11.5px] font-medium text-[#7C8581]">
                {stay.stayType === "driving_overnight"
                  ? "Continue to the next day without stopping"
                  : stay.address || LABELS[stay.stayType]}
              </div>
              {stay.checkOutTime && stay.stayType !== "driving_overnight" && (
                <div className="mt-2 font-mono text-[10.5px] font-bold text-[#71858B]">
                  Check-out {stay.checkOutTime}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {stay.price != null && (
                <span className="font-mono text-[11px] font-bold text-[#526F7D]">
                  {stay.price} {stay.currency}
                </span>
              )}
              <span className="grid size-7 place-items-center rounded-[8px] text-[#71858B] opacity-100 transition-all group-hover:bg-[#DEE6E4] md:opacity-0 md:group-hover:opacity-100">
                <Pencil className="size-3.5" />
              </span>
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border border-dashed border-[#B7C4C2] bg-[#EDEFEA] px-3.5 py-3 text-left shadow-[0_5px_16px_rgba(22,19,13,0.03)] transition-all hover:border-[#819A9E] hover:bg-[#E8ECE7]"
        >
          <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[#7C98A5]" />
          <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-full bg-[#526F7D] text-[#F7FAF8]">
            <Moon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-black leading-tight text-[#263F4C]">
              Plan the night
            </span>
            <span className="mt-1 block text-[11.5px] font-medium text-[#71858B]">
              Hotel, tent, car or drive overnight
            </span>
          </span>
          <span className="grid size-7 place-items-center rounded-full bg-[#DEE6E4] text-[#526F7D] transition group-hover:scale-105">
            <Plus className="size-4" />
          </span>
        </button>
      )}

      <StayDialog
        key={`${stay?.id ?? "new"}-${open}`}
        open={open}
        onOpenChange={setOpen}
        dayId={dayId}
        stay={stay}
        previousStay={previousStay}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

export function PreviousStayBanner({
  stay,
  departureTime,
  onSetDepartureTime,
}: {
  stay: TripStayPlain;
  departureTime?: string | null;
  onSetDepartureTime?: (departureTime: string) => void;
}) {
  const stayOption = STAY_OPTIONS.find(([value]) => value === stay.stayType);
  const StayIcon = stayOption?.[2] ?? BedDouble;

  return (
    <div className="relative w-full overflow-hidden rounded-[18px] border border-[#CDD3CF] bg-[#EDEFEA] px-3.5 py-3 text-left shadow-[0_5px_16px_rgba(22,19,13,0.04)]">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[#5E86A3]" />
      <div className="flex items-center gap-3">
        <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-full bg-[#526F7D] text-[#F7FAF8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
          <StayIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="rounded-full bg-[#DDE6E6] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#496775]">
              Night
            </span>
            <span className="truncate text-[10px] font-bold text-[#71858B]">
              {LABELS[stay.stayType]}
            </span>
          </div>
          <div className="mt-1.5 truncate text-[15px] font-black leading-tight text-[#16130D]">
            {stay.stayType === "driving_overnight" ? "On the road" : stay.name}
          </div>
          <div className="mt-1 truncate text-[11.5px] font-medium text-[#7C8581]">
            {stay.stayType === "driving_overnight"
              ? "Continuing from the previous day"
              : stay.address || LABELS[stay.stayType]}
          </div>
        </div>
        {onSetDepartureTime ? (
          <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
            <span className="text-[10px] font-bold text-[#71858B]">
              Departs
            </span>
            <PlainTimeInput
              value={departureTime ?? ""}
              onChange={onSetDepartureTime}
              compact
              plain
            />
          </span>
        ) : (
          departureTime && (
            <span className="shrink-0 font-mono text-[11px] font-bold text-[#526F7D]">
              Departs {departureTime}
            </span>
          )
        )}
      </div>
    </div>
  );
}

export function StayDialog({
  open,
  onOpenChange,
  dayId,
  stay,
  previousStay,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  stay?: TripStayPlain;
  previousStay?: TripStayPlain;
  onSave: (input: TripStayInput) => Promise<boolean>;
  onDelete: () => Promise<void>;
}) {
  const [type, setType] = useState<(typeof STAY_TYPES)[number]>(
    (stay?.stayType as (typeof STAY_TYPES)[number]) ?? "hotel",
  );
  const [place, setPlace] = useState<GeocodeResult | null>(
    stay?.lat != null && stay.lng != null
      ? {
          name: stay.name,
          address: stay.address,
          lat: stay.lat,
          lng: stay.lng,
          countryCode: stay.countryCode,
        }
      : null,
  );
  const [name, setName] = useState(stay?.name ?? "");
  const [checkIn, setCheckIn] = useState(stay?.checkInTime ?? "");
  const [checkOut, setCheckOut] = useState(stay?.checkOutTime ?? "");
  const [price, setPrice] = useState(stay?.price?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === "driving_overnight" && !name) {
      setName(DRIVING_OVERNIGHT_NAME);
    }
  }, [name, type]);

  function selectType(nextType: (typeof STAY_TYPES)[number]) {
    if (nextType === "driving_overnight") {
      setName(DRIVING_OVERNIGHT_NAME);
    } else if (type === "driving_overnight" && isAutomaticDrivingName(name)) {
      setName(place?.name ?? "");
    }
    setType(nextType);
  }

  async function submit() {
    setSaving(true);
    const ok = await onSave({
      afterDayId: dayId,
      name:
        name.trim() ||
        (type === "driving_overnight"
          ? DRIVING_OVERNIGHT_NAME
          : (place?.name ?? "Overnight stay")),
      stayType: type,
      status: "planned",
      address: place?.address ?? stay?.address ?? "",
      latitude: type === "driving_overnight" ? null : (place?.lat ?? stay?.lat),
      longitude:
        type === "driving_overnight" ? null : (place?.lng ?? stay?.lng),
      countryCode:
        type === "driving_overnight"
          ? null
          : (place?.countryCode ?? stay?.countryCode),
      checkInTime: type === "hotel" ? checkIn || null : null,
      checkOutTime: type === "hotel" ? checkOut || null : null,
      price: type !== "driving_overnight" && price ? Number(price) : null,
      currency: stay?.currency ?? "PLN",
      notes: null,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E7DFCE] bg-[#FBF8F1] sm:max-w-[620px] sm:rounded-[22px]">
        <DialogHeader>
          <DialogTitle className="font-['Bricolage_Grotesque'] text-2xl font-extrabold">
            Night after this day
          </DialogTitle>
          <DialogDescription>
            Choose where you rest, or mark that the journey continues overnight.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAY_OPTIONS.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => selectType(value)}
              className={`flex min-h-[72px] flex-col items-start justify-between rounded-[13px] border p-3 text-left text-xs font-bold transition ${
                type === value
                  ? "border-[#E4562A] bg-[#FBE7DD] text-[#B8431F]"
                  : "border-[#E7DFCE] bg-white text-[#5a5346] hover:bg-[#F3EFE4]"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {previousStay?.stayType !== "driving_overnight" &&
          previousStay?.lat != null &&
          previousStay.lng != null && (
            <button
              type="button"
              onClick={() => {
                const previousType = STAY_TYPES.includes(
                  previousStay.stayType as (typeof STAY_TYPES)[number],
                )
                  ? (previousStay.stayType as (typeof STAY_TYPES)[number])
                  : "hotel";
                setType(previousType);
                setName(previousStay.name);
                setPlace({
                  name: previousStay.name,
                  address: previousStay.address,
                  lat: previousStay.lat!,
                  lng: previousStay.lng!,
                  countryCode: previousStay.countryCode,
                });
              }}
              className="flex w-full items-center gap-3 rounded-[13px] border border-[#CFE0E6] bg-[#EEF3F5] p-3 text-left transition hover:border-[#6E9BC0] hover:bg-[#E8F0F6]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#5E86A3] shadow-sm">
                <Moon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7893a2]">
                  Use previous night
                </span>
                <span className="block truncate text-sm font-bold text-[#334d5c]">
                  {previousStay.name}
                </span>
                <span className="block truncate text-xs text-[#7893a2]">
                  {previousStay.address}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#5E86A3]" />
            </button>
          )}

        {type === "driving_overnight" ? (
          <div className="rounded-[14px] border border-[#D7C8A9] bg-[#F6EEDC] p-4 text-sm text-[#6b5835]">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CarFront className="size-4" /> Continue through the night
            </div>
            No accommodation marker will be added. The next day starts on the
            road and the route remains continuous.
          </div>
        ) : (
          <div>
            {place ? (
              <div className="flex items-center gap-3 rounded-[13px] border border-[#CFE0E6] bg-white p-3">
                <Moon className="size-5 text-[#5E86A3]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{place.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {place.address}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlace(null)}
                  className="text-xs font-bold text-[#E4562A]"
                >
                  Change
                </button>
              </div>
            ) : (
              <AddStopBox
                onAdd={(result) => {
                  setPlace(result);
                  if (!name.trim() || isAutomaticDrivingName(name)) {
                    setName(result.name);
                  }
                }}
                placeholder="Search hotel, camping or parking"
                helpText="Optional. If left empty, the night's location will be the last stop of this day."
              />
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#6a6353] sm:col-span-2">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-10 w-full rounded-[10px] border border-[#D8CEB8] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#E4562A]/25"
            />
          </label>
          {type === "hotel" && (
            <>
              <label className="text-xs font-bold text-[#6a6353]">
                Check-in
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 h-10 w-full rounded-[10px] border border-[#D8CEB8] bg-white px-3"
                />
              </label>
              <label className="text-xs font-bold text-[#6a6353]">
                Check-out
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 h-10 w-full rounded-[10px] border border-[#D8CEB8] bg-white px-3"
                />
              </label>
            </>
          )}
          {type !== "driving_overnight" && (
            <label className="text-xs font-bold text-[#6a6353]">
              Cost (PLN)
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 h-10 w-full rounded-[10px] border border-[#D8CEB8] bg-white px-3"
              />
            </label>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {stay ? (
            <button
              type="button"
              onClick={async () => {
                await onDelete();
                onOpenChange(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8431F]"
            >
              <Trash2 className="size-4" /> Remove
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#16130D] px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Save night <ChevronRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
