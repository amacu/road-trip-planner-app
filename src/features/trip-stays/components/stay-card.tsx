"use client";

import {
  BedDouble,
  CarFront,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Route,
  TentTree,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AddStopBox } from "@/features/trip-stops/components/add-stop-box";
import {
  EditableStopName,
  PlainTimeInput,
} from "@/features/trip-stops/components/stop-card";
import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import { cn } from "@/lib/utils";
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
  const [draftName, setDraftName] = useState(stay?.name ?? "");

  useEffect(() => {
    setDraftName(stay?.name ?? "");
  }, [stay?.id, stay?.name]);

  const stayOption = stay
    ? STAY_OPTIONS.find(([value]) => value === stay.stayType)
    : undefined;
  const StayIcon = stayOption?.[2] ?? BedDouble;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[18px] border shadow-[0_5px_16px_rgba(22,19,13,0.04)] transition-all duration-200",
        open
          ? "border-[#8EAAAA] bg-[#EDF2EF] shadow-[0_10px_24px_rgba(48,69,77,0.11)]"
          : stay
            ? "border-[#CDD3CF] bg-[#EDEFEA] hover:border-[#9FADAE] hover:bg-[#E8ECE7] hover:shadow-[0_10px_24px_rgba(48,69,77,0.1)]"
            : "border-dashed border-[#B7C4C2] bg-[#EDEFEA] hover:border-[#819A9E] hover:bg-[#E8ECE7]",
      )}
    >
      <span className="absolute inset-y-3 left-0 z-[1] w-[3px] rounded-r-full bg-[#5E86A3]" />
      {stay ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={cn(
            "group relative w-full px-3.5 text-left transition-all duration-200",
            open ? "py-3" : "py-2",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-[12px] bg-[#526F7D] text-[#F7FAF8]">
              <StayIcon className="size-4" />
            </span>
            <div className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
              {open ? (
                <EditableStopName
                  value={draftName}
                  onChange={setDraftName}
                  ariaLabel="Night name"
                />
              ) : (
                <div className="truncate text-[15px] font-black leading-tight text-[#16130D]">
                  {stay.name}
                </div>
              )}
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <span className="rounded-full bg-[#DDE6E6] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#496775]">
                  Night
                </span>
                <span className="truncate text-[10px] font-bold text-[#71858B]">
                  {LABELS[stay.stayType]}
                  {arrivalTime && stay.stayType !== "driving_overnight"
                    ? ` · Arrives ${arrivalTime}`
                    : ""}
                  {stay.price != null
                    ? ` · ${stay.price} ${stay.currency}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <span className="grid size-7 place-items-center rounded-[8px] text-[#71858B] transition-all group-hover:bg-[#DEE6E4]">
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={cn(
            "group relative flex w-full items-center gap-3 px-3.5 text-left transition-all",
            open ? "py-3" : "py-2",
          )}
        >
          <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-[12px] bg-[#526F7D] text-[#F7FAF8]">
            <Moon className="size-4" />
          </span>
          <span className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
            {open ? (
              <EditableStopName
                value={draftName}
                onChange={setDraftName}
                ariaLabel="Night name"
                placeholder="Name the night"
              />
            ) : (
              <span className="block text-[15px] font-black leading-tight text-[#263F4C]">
                Plan the night
              </span>
            )}
            <span className="mt-0.5 block text-[10px] font-bold text-[#71858B]">
              Hotel, tent, car or drive overnight
            </span>
          </span>
          <span className="grid size-7 place-items-center rounded-[8px] text-[#71858B] transition-colors group-hover:bg-[#DEE6E4]">
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180",
              )}
            />
          </span>
        </div>
      )}

      {open && (
        <StayEditor
          key={stay?.id ?? "new"}
          dayId={dayId}
          stay={stay}
          previousStay={previousStay}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setOpen(false)}
          embedded
          nameValue={draftName}
          onNameChange={setDraftName}
        />
      )}
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
    <div className="relative w-full overflow-hidden rounded-[18px] border border-[#CDD3CF] bg-[#EDEFEA] px-3.5 py-2 text-left shadow-[0_5px_16px_rgba(22,19,13,0.04)]">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[#5E86A3]" />
      <div className="flex items-center gap-3">
        <span className="ml-5 grid size-9 shrink-0 place-items-center rounded-[12px] bg-[#526F7D] text-[#F7FAF8]">
          <StayIcon className="size-4" />
        </span>
        <div className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
          <div className="truncate text-[15px] font-black leading-tight text-[#16130D]">
            {stay.stayType === "driving_overnight" ? "On the road" : stay.name}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="rounded-full bg-[#DDE6E6] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#496775]">
              Night
            </span>
            <span className="truncate text-[10px] font-bold text-[#71858B]">
              {LABELS[stay.stayType]}
            </span>
            {(onSetDepartureTime || departureTime) && (
              <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#71858B]">
                <span>· Departs</span>
                {onSetDepartureTime ? (
                  <PlainTimeInput
                    value={departureTime ?? ""}
                    onChange={onSetDepartureTime}
                    compact
                    plain
                  />
                ) : (
                  <span className="font-mono text-[11px] text-[#526F7D]">
                    {departureTime}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StayEditor({
  dayId,
  stay,
  previousStay,
  onSave,
  onDelete,
  onClose,
  embedded = false,
  nameValue,
  onNameChange,
}: {
  dayId: string;
  stay?: TripStayPlain;
  previousStay?: TripStayPlain;
  onSave: (input: TripStayInput) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  embedded?: boolean;
  nameValue?: string;
  onNameChange?: (name: string) => void;
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
  const [internalName, setInternalName] = useState(stay?.name ?? "");
  const name = nameValue ?? internalName;
  const setName = onNameChange ?? setInternalName;
  const [price, setPrice] = useState(stay?.price?.toString() ?? "");
  const [editingLocation, setEditingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === "driving_overnight" && !name) {
      setName(DRIVING_OVERNIGHT_NAME);
    }
  }, [name, setName, type]);

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
      address: type === "driving_overnight" ? "" : (place?.address ?? ""),
      latitude: type === "driving_overnight" ? null : (place?.lat ?? null),
      longitude: type === "driving_overnight" ? null : (place?.lng ?? null),
      countryCode:
        type === "driving_overnight" ? null : (place?.countryCode ?? null),
      price: type !== "driving_overnight" && price ? Number(price) : null,
      currency: stay?.currency ?? "PLN",
      notes: null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div
      className={cn(
        "overflow-hidden",
        embedded
          ? "border-t border-[#CFDAD6] bg-transparent"
          : "rounded-[18px] border border-[#B9C9C8] bg-[#F5F5EF] shadow-[0_8px_24px_rgba(48,69,77,0.08)]",
      )}
    >
      {!embedded && (
        <div className="border-b border-[#D8DEDA] px-4 py-3">
          <div className="text-sm font-black text-[#263F4C]">
            {stay ? "Edit night" : "Plan the night"}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-[#71858B]">
            Choose where you rest, or continue the journey overnight.
          </div>
        </div>
      )}

      <div className="space-y-4 px-3.5 py-4 sm:px-4">
        {type === "driving_overnight" ? (
          <div className="rounded-[14px] border border-[#D7C8A9] bg-[#F6EEDC] p-4 text-sm text-[#6b5835]">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CarFront className="size-4" /> Continue through the night
            </div>
            No accommodation marker will be added. The next day starts on the
            road and the route remains continuous.
          </div>
        ) : (
          <div className="rounded-[13px] border border-[#C8D5D4]/80 bg-white/20 p-2.5">
            <div className="flex items-start gap-2.5">
              {place ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#DDE8E8] text-[#526F7D] transition-colors hover:bg-[#D1E0E0]"
                  title="Open in Google Maps"
                  aria-label={`Open ${name || place.name} in Google Maps`}
                >
                  <MapPin className="size-4" />
                </a>
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#DDE8E8] text-[#526F7D]">
                  <MapPin className="size-4" />
                </span>
              )}
              <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center">
                {place ? (
                  <>
                    <p className="truncate text-[11.5px] font-semibold leading-4 text-[#6F685B]">
                      {place.address || place.name}
                    </p>
                    <p className="font-mono text-[9.5px] font-medium leading-4 text-[#A09888]">
                      {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] font-semibold text-[#948B76]">
                    No location selected
                  </p>
                )}
              </div>
              <div className="flex min-h-10 shrink-0 items-center gap-1">
                {place && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlace(null);
                      setEditingLocation(false);
                    }}
                    className="grid size-8 place-items-center rounded-[9px] text-[#817A6E] transition-colors hover:bg-[#DDE8E8] hover:text-[#496775]"
                    title="Remove location"
                    aria-label="Remove night location"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingLocation((current) => !current)}
                  className="grid size-8 place-items-center rounded-[9px] text-[#637D82] transition-colors hover:bg-[#DDE8E8] hover:text-[#3F626A]"
                  title={place ? "Change location" : "Add location"}
                  aria-label={
                    place ? "Change night location" : "Add night location"
                  }
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            </div>
            {editingLocation && (
              <div className="mt-3 space-y-2">
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
                        setEditingLocation(false);
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-[13px] border border-[#D8CEB8] bg-[#FFFCF6] px-3 py-2 text-left transition-colors hover:border-[#C8BDA8] hover:bg-[#F4EEE2]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#EEE7DA] text-[#7A7264] transition-colors group-hover:bg-[#E6DDCE] group-hover:text-[#5F594D]">
                        <Moon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-black uppercase tracking-[0.1em] text-[#9A917F]">
                          Use previous night
                        </span>
                        <span className="block truncate text-xs font-bold text-[#5F594D]">
                          {previousStay.name}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-[#A89F88] transition-transform group-hover:translate-x-0.5 group-hover:text-[#7A7264]" />
                    </button>
                  )}
                <AddStopBox
                  embedded
                  onAdd={(result) => {
                    setPlace(result);
                    if (!name.trim() || isAutomaticDrivingName(name)) {
                      setName(result.name);
                    }
                    setEditingLocation(false);
                  }}
                  onClose={() => setEditingLocation(false)}
                  placeholder="Search a new location"
                  helpText=""
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-[10px] border border-[#C8D5D4]/80 bg-white/20 px-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.08em] text-[#8B948E]">
              Stay
            </span>
            <span className="relative flex items-center">
              <select
                value={type}
                onChange={(event) =>
                  selectType(event.target.value as (typeof STAY_TYPES)[number])
                }
                className="h-7 appearance-none bg-transparent py-0 pl-0 pr-5 text-[11px] font-bold text-[#526F7D] outline-none"
                aria-label="Night type"
              >
                {STAY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 size-3.5 text-[#8B948E]" />
            </span>
          </label>
          {type !== "driving_overnight" && (
            <label className="flex h-9 items-center gap-2 rounded-[10px] border border-[#C8D5D4]/80 bg-white/20 px-2.5">
              <span className="text-[9px] font-black uppercase tracking-[0.08em] text-[#8B948E]">
                Cost
              </span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="—"
                className="w-16 bg-transparent text-right font-mono text-[11px] font-bold text-[#526F7D] outline-none placeholder:text-[#A89F88] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Night cost in PLN"
              />
              <span className="text-[9px] font-black uppercase tracking-[0.06em] text-[#A09888]">
                PLN
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#D8DEDA] px-3.5 py-3 sm:px-4">
        {stay ? (
          <button
            type="button"
            onClick={async () => {
              await onDelete();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8431F]"
          >
            <Trash2 className="size-4" /> Remove
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[10px] px-3 text-xs font-bold text-[#71858B] hover:bg-[#E8ECE7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#263F4C] px-4 text-xs font-bold text-white disabled:opacity-40"
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
      </div>
    </div>
  );
}
