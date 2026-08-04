"use client";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Eye,
  Link2,
  MapPin,
  PenLine,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLogo } from "@/components/shared/app-logo";
import { FuelOverviewCard } from "@/features/fuel/components/fuel-overview-card";
import type { FuelPlan } from "@/features/fuel/lib/fuel-plan";
import {
  addTripMemberAction,
  createTripInviteLinkAction,
  removeTripMemberAction,
  updateTripMemberRoleAction,
} from "@/features/trips/actions";
import { TripSettingsPanel } from "@/features/trips/components/trip-settings-view";
import type {
  StopPoint,
  TripPlain,
  TripStayPlain,
  VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import {
  buildDayStopColors,
  dayMarkerColor,
  formatDistance,
  formatDuration,
} from "@/lib/geo";
import {
  TRIP_MEMBER_ROLES,
  type TripMemberRole,
  type TripUpdateInput,
} from "@/lib/validators/trip";
import { cn } from "@/lib/utils";

const MapView = dynamic(
  () =>
    import("@/features/trip-stops/components/map-view").then(
      (module) => module.MapView,
    ),
  { ssr: false },
);

function stayAsMapStop(stay: TripStayPlain): StopPoint {
  return {
    id: `stay-overview-${stay.id}`,
    name: stay.name,
    address: stay.address,
    lat: stay.lat ?? 0,
    lng: stay.lng ?? 0,
    hasLocation: stay.lat != null && stay.lng != null,
    countryCode: stay.countryCode,
    itemType: "stop",
    travelMode: "driving",
    startTime: null,
    endTime: null,
    category: null,
    description: null,
    visitDurationMin: null,
    notes: stay.notes,
    activities: [],
  };
}

export function OverviewView({
  trip,
  trips,
  days,
  stays,
  currentUserId,
  vehicles,
  tripTotalKm,
  tripTotalMin,
  fuelPlan,
  fuelVehicle,
  onSaveTrip,
  onDeleteTrip,
  onSelectDay,
  onLogoClick,
}: {
  trip: TripPlain;
  trips: Array<{ id: string; name: string }>;
  days: TripPlain["days"];
  stays: TripStayPlain[];
  currentUserId: string;
  vehicles: VehiclePlain[];
  tripTotalKm: number;
  tripTotalMin: number;
  fuelPlan: FuelPlan | null;
  fuelVehicle: VehiclePlain | null;
  onSaveTrip: (patch: TripUpdateInput) => Promise<void>;
  onDeleteTrip: () => void;
  onSelectDay: (dayId: string) => void;
  onLogoClick: () => void;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const allStops = days.flatMap((day) => day.stops);
  const overviewMapStops = days.flatMap((day) => {
    const dayStops = day.stops.filter((stop) => stop.itemType !== "activity");
    const stay = stays.find((item) => item.afterDayId === day.id);
    if (
      stay?.stayType !== "driving_overnight" &&
      stay?.lat != null &&
      stay.lng != null
    ) {
      dayStops.push(stayAsMapStop(stay));
    }
    return dayStops;
  });
  const stopColors = buildDayStopColors(days);
  days.forEach((day, index) => {
    const stay = stays.find((item) => item.afterDayId === day.id);
    if (stay) stopColors[`stay-overview-${stay.id}`] = dayMarkerColor(index);
  });
  const stopCount = allStops.length;
  const routeStart = overviewMapStops[0]?.name ?? "Start";
  const routeEnd =
    overviewMapStops[overviewMapStops.length - 1]?.name ?? "Finish";
  const dateRange = formatTripDateRange(trip.startDate, days.length);
  const plannedDays = days.filter((day) => day.stops.length > 0).length;
  const requiredStays = Math.max(days.length - 1, 0);
  const plannedStays = Math.min(stays.length, requiredStays);
  const readinessChecks = [
    { label: "Travel dates", complete: Boolean(trip.startDate) },
    {
      label: "Daily route",
      complete: days.length > 0 && plannedDays === days.length,
    },
    { label: "Vehicle", complete: Boolean(fuelVehicle) },
    {
      label: "Overnight stays",
      complete: requiredStays === 0 || plannedStays >= requiredStays,
    },
    { label: "Packing list", complete: trip.packingItems.length > 0 },
  ];
  const completedChecks = readinessChecks.filter(
    (check) => check.complete,
  ).length;
  const readiness = Math.round(
    (completedChecks / readinessChecks.length) * 100,
  );
  const attentionItems = [
    ...(!trip.startDate ? ["Add travel dates"] : []),
    ...(days.length === 0
      ? ["Create the first day of your trip"]
      : plannedDays < days.length
        ? [
            `${days.length - plannedDays} ${days.length - plannedDays === 1 ? "day needs" : "days need"} a route`,
          ]
        : []),
    ...(plannedStays < requiredStays
      ? [
          `${requiredStays - plannedStays} ${requiredStays - plannedStays === 1 ? "overnight stay is" : "overnight stays are"} missing`,
        ]
      : []),
    ...(!fuelVehicle ? ["Choose a vehicle for fuel estimates"] : []),
  ].slice(0, 3);
  const people = [
    {
      id: trip.ownerId,
      label: profileName(trip.ownerProfile) ?? "Trip owner",
      detail: profileDetail(trip.ownerProfile) ?? "Owner",
    },
    ...trip.members.map((member) => ({
      id: member.id,
      label: memberName(member),
      detail: memberDetail(member),
    })),
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#EEEAE1] lg:flex-row">
      <div className="absolute inset-0 hidden lg:block">
        <MapView
          stops={overviewMapStops}
          viewportKey={`overview-${trip.id}`}
          desktopLeftInset={736}
          stopColors={stopColors}
        />
      </div>

      <header className="relative z-[700] flex min-h-[calc(68px+env(safe-area-inset-top))] shrink-0 items-center gap-3 border-b border-[#E4DBC8] bg-[#FBF8F1]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_8px_22px_-18px_rgba(22,19,13,0.55)] backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 rounded-[10px]"
          title="Open home"
          aria-label="Open home"
        >
          <AppLogo className="[&_img]:!h-9" />
        </button>
        <div className="flex min-w-0 flex-1 justify-end">
          <Select
            value={trip.id}
            onValueChange={(tripId) => {
              if (tripId !== trip.id) router.push(`/trips/${tripId}`);
            }}
          >
            <SelectTrigger
              aria-label="Switch trip"
              className="h-10 w-auto max-w-full gap-2 rounded-[12px] border-[#E2D8C6] bg-[#FFFCF6] px-3 text-[12px] font-black text-[#302B23] shadow-sm focus:ring-brand/30 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-[#9A917F]"
            >
              <MapPin className="size-3.5 shrink-0 text-brand" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center">
              {trips.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="relative z-[600] flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#FFFCF6] lg:mx-2 lg:my-2.5 lg:w-[720px] lg:flex-none lg:shrink-0 lg:rounded-[24px] lg:border lg:border-[#DED3C0] lg:shadow-[0_18px_42px_rgba(54,43,25,0.11),0_3px_10px_rgba(54,43,25,0.05)]">
        <div className="relative min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:p-7">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-5 top-5 hidden size-9 place-items-center rounded-[11px] border border-[#E7DFCE] bg-[#FBF8F1] text-[#6a6353] shadow-sm transition-colors hover:bg-[#FBE7DD] hover:text-[#E4562A] md:grid"
            title="Edit trip settings"
          >
            <Pencil className="size-4" />
          </button>

          <div
            className="relative overflow-hidden rounded-[20px] bg-[#16130D] p-5 text-[#FFF9EF] shadow-[0_18px_35px_rgba(22,19,13,0.18)] md:p-6"
            style={
              trip.heroImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(16, 14, 10, 0.94) 0%, rgba(16, 14, 10, 0.78) 54%, rgba(16, 14, 10, 0.48) 100%), url(${JSON.stringify(trip.heroImageUrl)})`,
                    backgroundPosition: "center, center",
                    backgroundRepeat: "no-repeat, no-repeat",
                    backgroundSize: "cover, cover",
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-[11px] border border-white/15 bg-black/25 text-[#FFF9EF] shadow-sm backdrop-blur-sm transition-colors hover:bg-black/40 md:hidden"
              title="Edit trip settings"
              aria-label="Edit trip settings"
            >
              <Pencil className="size-4" />
            </button>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#BDB4A3]">
              <span className="size-1.5 rounded-sm bg-brand" />
              Trip command center
            </div>
            <h1 className="mt-3 max-w-[560px] font-['Bricolage_Grotesque'] text-[32px] font-extrabold leading-[0.98] tracking-[-0.035em] md:text-[42px]">
              {trip.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#CFC6B6]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-brand" />
                {routeStart} → {routeEnd}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-[#70B990]" />
                {dateRange ?? "Dates not set"}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
              <HeroMetric
                label="Distance"
                value={formatDistance(tripTotalKm)}
              />
              <HeroMetric
                label="Driving"
                value={formatDuration(tripTotalMin)}
              />
              <HeroMetric
                label="Fuel estimate"
                value={fuelPlan ? `${Math.round(fuelPlan.totalCost)} PLN` : "—"}
              />
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <TeamCard
                trip={trip}
                currentUserId={currentUserId}
                people={people}
              />
              <button
                type="button"
                onClick={() => days[0] && onSelectDay(days[0].id)}
                disabled={days.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-brand px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(228,86,42,0.25)] transition hover:bg-[#CF4822] disabled:opacity-45"
              >
                Open planner
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <section className="mt-4 rounded-[18px] border border-[#DED3C0] bg-[#FBF8F1] p-5 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9A917F]">
                  Trip readiness
                </p>
                <p className="mt-1 font-['Bricolage_Grotesque'] text-xl font-bold tracking-[-0.02em]">
                  {readiness === 100
                    ? "Ready to hit the road"
                    : "Your plan is taking shape"}
                </p>
              </div>
              <span className="font-mono text-2xl font-black text-[#2E7A57]">
                {readiness}%
              </span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-[4px] bg-[#E8E0CF]">
              <div
                className="h-full rounded-[4px] bg-[#2E7A57] transition-[width] duration-500"
                style={{ width: `${readiness}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {readinessChecks.map((check) => (
                <span
                  key={check.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[10px] font-bold",
                    check.complete
                      ? "bg-[#E1EFE7] text-[#276848]"
                      : "bg-[#F0EADB] text-[#8A8270]",
                  )}
                >
                  {check.complete ? (
                    <Check className="size-3" />
                  ) : (
                    <span className="size-1.5 rounded-sm bg-current opacity-50" />
                  )}
                  {check.label}
                </span>
              ))}
            </div>
          </section>

          {attentionItems.length > 0 && (
            <section className="mt-4 rounded-[18px] border border-[#E8C6B9] bg-[#FFF3EE] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#A94020]">
                <CircleAlert className="size-4" />
                Needs attention
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {attentionItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-[10px] bg-white/65 px-3 py-2 text-xs font-bold text-[#754E40]"
                  >
                    <ChevronRight className="size-3.5 shrink-0 text-brand" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9A917F]">
                  Itinerary
                </p>
                <h2 className="mt-1 font-['Bricolage_Grotesque'] text-[22px] font-bold tracking-[-0.025em]">
                  Day by day
                </h2>
              </div>
              <span className="text-xs font-bold text-[#8A8270]">
                {stopCount} places · {stays.length} stays
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {days.length > 0 ? (
                days.map((day, index) => (
                  <OverviewDayCard
                    key={day.id}
                    day={day}
                    index={index}
                    color={dayMarkerColor(index)}
                    tripStartDate={trip.startDate}
                    stay={stays.find((item) => item.afterDayId === day.id)}
                    onSelect={() => onSelectDay(day.id)}
                  />
                ))
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-[16px] border border-dashed border-[#D8CEB8] bg-[#FBF8F1]/70 p-6 text-sm font-bold text-[#9A917F]"
                >
                  Create a day in Planner to start building the route.
                </button>
              )}
            </div>
          </section>

          <div className="mt-4">
            <FuelOverviewCard plan={fuelPlan} vehicle={fuelVehicle} />
          </div>
        </div>
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[#D8CEB8] bg-[#F3EDE1] p-4 sm:max-w-3xl sm:rounded-[26px] sm:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Trip settings</DialogTitle>
          </DialogHeader>
          <TripSettingsPanel
            trip={trip}
            vehicles={vehicles}
            isOwner={trip.ownerId === currentUserId}
            onSave={onSaveTrip}
            onDelete={onDeleteTrip}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[#8F887C]">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-black text-[#FFF9EF] md:text-base">
        {value}
      </p>
    </div>
  );
}

function OverviewDayCard({
  day,
  index,
  color,
  tripStartDate,
  stay,
  onSelect,
}: {
  day: TripPlain["days"][number];
  index: number;
  color: string;
  tripStartDate: string | null;
  stay?: TripStayPlain;
  onSelect: () => void;
}) {
  const routeStops = day.stops.filter((stop) => stop.itemType !== "activity");
  const first = routeStops[0]?.name;
  const last = routeStops.at(-1)?.name;
  const date = day.date ?? overviewDayDate(tripStartDate, index);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-[15px] border border-[#E7DFCE] bg-[#FBF8F1] p-3 text-left shadow-[0_4px_12px_rgba(22,19,13,0.04)] transition hover:-translate-y-px hover:border-[#D5C8AF] hover:shadow-[0_9px_20px_rgba(22,19,13,0.08)]"
    >
      <span
        className="grid size-[42px] place-items-center rounded-[12px] text-center text-white shadow-[0_6px_14px_rgba(22,19,13,0.14)]"
        style={{ backgroundColor: color }}
      >
        <span>
          <span className="block text-[8px] font-black uppercase tracking-[0.08em] text-white/55">
            Day
          </span>
          <span className="block font-mono text-sm font-black leading-none">
            {index + 1}
          </span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-black text-[#302B23]">
            {day.name ||
              (first && last ? `${first} → ${last}` : `Day ${index + 1}`)}
          </span>
          {date && (
            <span className="shrink-0 text-[10px] font-bold text-[#9A917F]">
              {formatCompactDate(date)}
            </span>
          )}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-3 text-[10.5px] font-semibold text-[#8A8270]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 text-brand" />
            {routeStops.length} {routeStops.length === 1 ? "place" : "places"}
          </span>
          {stay && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <BedDouble className="size-3 shrink-0 text-[#526F7D]" />
              <span className="truncate">{stay.name}</span>
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="size-4 text-[#B3A994] transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  );
}

function TeamCard({
  trip,
  currentUserId,
  people,
}: {
  trip: TripPlain;
  currentUserId: string;
  people: Array<{ id: string; label: string; detail: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<
    string | null
  >(null);
  const canManageMembers = trip.ownerId === currentUserId;

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = memberIdentifier.trim();
    if (!identifier) return;

    setIsSavingMember(true);
    const result = await addTripMemberAction(trip.id, { identifier });
    setIsSavingMember(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setMemberIdentifier("");
    toast.success("Team member added.");
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setRemovingMemberId(memberId);
    const result = await removeTripMemberAction(trip.id, memberId);
    setRemovingMemberId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Team member removed.");
    router.refresh();
  }

  async function shareInviteLink() {
    setIsCreatingInvite(true);
    const result = await createTripInviteLinkAction(trip.id);
    setIsCreatingInvite(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const inviteUrl = new URL(result.data, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${trip.name}`,
          text: `Join my trip “${trip.name}”.`,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }

    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied.");
  }

  async function changeMemberRole(memberId: string, role: TripMemberRole) {
    setUpdatingRoleMemberId(memberId);
    const result = await updateTripMemberRoleAction(trip.id, memberId, {
      role,
    });
    setUpdatingRoleMemberId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Role updated.");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center rounded-[12px] p-0.5 transition hover:bg-white/10"
        title={`Manage team · ${people.length} ${people.length === 1 ? "person" : "people"}`}
        aria-label="Manage team"
      >
        {people.slice(0, 6).map((person, index) => (
          <span
            key={person.id}
            className={cn(
              "grid size-9 place-items-center rounded-full border-2 border-[#16130D] text-xs font-black text-white shadow-sm",
              index > 0 && "-ml-2",
              index % 3 === 0 && "bg-[#6E9BC0]",
              index % 3 === 1 && "bg-[#E4562A]",
              index % 3 === 2 && "bg-[#2E7A57]",
            )}
            title={`${person.label} · ${person.detail}`}
          >
            {getInitials(person.label)}
          </span>
        ))}
        {people.length > 6 && (
          <span className="-ml-2 grid size-9 place-items-center rounded-full border-2 border-[#16130D] bg-[#EBE4D3] text-[10px] font-black text-[#6A6353] shadow-sm">
            +{people.length - 6}
          </span>
        )}
        <span className="-ml-2 grid size-9 place-items-center rounded-full border-2 border-[#16130D] bg-[#FFF9EF] text-[#E4562A] shadow-sm">
          <UserPlus className="size-4" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-xl overflow-y-auto rounded-[22px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Team</DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-3">
            <TeamRow
              name={profileName(trip.ownerProfile) ?? "Trip owner"}
              detail={profileDetail(trip.ownerProfile) ?? trip.ownerId}
              badge="Owner"
            />
            {trip.members.map((member) => (
              <TeamRow
                key={member.id}
                name={memberName(member)}
                detail={memberDetail(member)}
                role={isTripMemberRole(member.role) ? member.role : "editor"}
                onChangeRole={
                  canManageMembers
                    ? (role) => changeMemberRole(member.id, role)
                    : undefined
                }
                isUpdatingRole={updatingRoleMemberId === member.id}
                onRemove={
                  canManageMembers ? () => removeMember(member.id) : undefined
                }
                isRemoving={removingMemberId === member.id}
              />
            ))}
          </div>

          {canManageMembers && (
            <div className="mt-2 space-y-2.5 border-t border-[#E7DFCE] pt-4">
              <form
                onSubmit={addMember}
                className="grid grid-cols-[minmax(0,1fr)_40px] gap-2"
              >
                <input
                  value={memberIdentifier}
                  onChange={(event) => setMemberIdentifier(event.target.value)}
                  placeholder="Email or username"
                  className="h-10 min-w-0 rounded-xl border border-[#E7DFCE] bg-[#fffaf0] px-3 text-sm font-semibold outline-none ring-[#E4562A]/30 placeholder:text-[#948b76] focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={isSavingMember || !memberIdentifier.trim()}
                  className="grid size-10 place-items-center rounded-xl bg-[#E4562A] text-white hover:bg-[#cf4822] disabled:opacity-50"
                  title="Add team member"
                >
                  <UserPlus className="size-4" />
                </button>
              </form>
              <button
                type="button"
                onClick={shareInviteLink}
                disabled={isCreatingInvite}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#D8CEB8] bg-[#FFFCF6] text-xs font-black text-[#4F493E] transition hover:border-brand/40 hover:bg-[#FBE7DD] hover:text-brand disabled:opacity-50"
              >
                <Link2 className="size-4" />
                {isCreatingInvite ? "Creating link..." : "Share invite link"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamRow({
  name,
  detail,
  badge,
  role,
  onChangeRole,
  isUpdatingRole,
  isRemoving,
  onRemove,
}: {
  name: string;
  detail: string;
  badge?: string;
  role?: TripMemberRole;
  onChangeRole?: (role: TripMemberRole) => void;
  isUpdatingRole?: boolean;
  isRemoving?: boolean;
  onRemove?: () => void;
}) {
  const roleInfo = role ? ROLE_PRESENTATION[role] : null;
  const RoleIcon = roleInfo?.icon;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[16px] bg-[#FBF8F1] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#16130D] text-xs font-black text-white">
          {getInitials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs font-semibold text-[#948b76]">
            {detail}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        {badge && (
          <span className="rounded-full bg-[#FBE7DD] px-2 py-1 text-[10px] font-black uppercase text-[#E4562A]">
            {badge}
          </span>
        )}

        {roleInfo &&
          RoleIcon &&
          (onChangeRole ? (
            <Select
              value={role}
              onValueChange={(value) => onChangeRole(value as TripMemberRole)}
              disabled={isUpdatingRole}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-[118px] gap-1.5 rounded-full border-0 px-3 text-xs font-bold shadow-none",
                  roleInfo.tone,
                )}
              >
                <SelectValue>
                  <span className="flex items-center gap-1.5">
                    <RoleIcon className="size-3.5 shrink-0" />
                    {roleInfo.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRIP_MEMBER_ROLES.map((option) => {
                  const OptionIcon = ROLE_PRESENTATION[option].icon;
                  return (
                    <SelectItem
                      key={option}
                      value={option}
                      className="text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <OptionIcon className="size-3.5 text-muted-foreground" />
                        {ROLE_PRESENTATION[option].label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                roleInfo.tone,
              )}
            >
              <RoleIcon className="size-3.5 shrink-0" />
              {roleInfo.label}
            </span>
          ))}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[#948b76] hover:bg-white hover:text-destructive disabled:opacity-50"
            title="Remove team member"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function profileName(profile: TripPlain["ownerProfile"] | null | undefined) {
  return profile?.fullName || profile?.username || profile?.email || null;
}

function profileDetail(profile: TripPlain["ownerProfile"] | null | undefined) {
  if (!profile) return null;
  const parts = [
    profile.username ? `@${profile.username}` : null,
    profile.email,
  ].filter(Boolean);
  return parts.join(" · ");
}

function memberName(member: TripPlain["members"][number]) {
  return member.fullName || member.username || member.email || "Collaborator";
}

function memberDetail(member: TripPlain["members"][number]) {
  const parts = [
    member.username ? `@${member.username}` : null,
    member.email,
  ].filter(Boolean);
  return parts.join(" · ") || member.userId;
}

function isTripMemberRole(value: string): value is TripMemberRole {
  return (TRIP_MEMBER_ROLES as readonly string[]).includes(value);
}

const ROLE_PRESENTATION: Record<
  TripMemberRole,
  { icon: typeof PenLine; label: string; tone: string }
> = {
  editor: {
    icon: PenLine,
    label: "Editor",
    tone: "bg-[#E1EFE7] text-[#276848]",
  },
  viewer: {
    icon: Eye,
    label: "Viewer",
    tone: "bg-[#EBE4D3] text-[#8a8270]",
  },
};

function getInitials(value: string) {
  const words = value
    .replace(/^@/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function formatTripDateRange(startDate: string | null, dayCount: number) {
  if (!startDate) return null;
  if (dayCount <= 1) return formatTripDate(startDate);

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start.getTime() + (dayCount - 1) * 86_400_000);
  return `${formatTripDate(startDate)} - ${formatTripDate(end.toISOString().slice(0, 10))}`;
}

function overviewDayDate(startDate: string | null, dayIndex: number) {
  if (!startDate) return null;
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTripDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
