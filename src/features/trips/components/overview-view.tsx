"use client";

import { Eye, PenLine, Pencil, Trash2, UserPlus, Users } from "lucide-react";
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
import { LogoMark } from "@/components/shared/app-logo";
import { FuelOverviewCard } from "@/features/fuel/components/fuel-overview-card";
import type { FuelPlan } from "@/features/fuel/lib/fuel-plan";
import {
  addTripMemberAction,
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
import { buildDayStopColors, formatDistance, formatDuration } from "@/lib/geo";
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
  const stopCount = allStops.length;
  const routeStart = overviewMapStops[0]?.name ?? "Start";
  const routeEnd =
    overviewMapStops[overviewMapStops.length - 1]?.name ?? "Finish";
  const dateRange = formatTripDateRange(trip.startDate, days.length);
  const statCards = [
    {
      label: "Distance",
      value: formatDistance(tripTotalKm),
      sub: `${routeStart} -> ${routeEnd}`,
      color: "#E4562A",
    },
    {
      label: "Drive time",
      value: formatDuration(tripTotalMin),
      sub: `across ${days.length} ${days.length === 1 ? "day" : "days"}`,
      color: "#2E7A57",
    },
  ];
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
    <div className="flex min-h-0 flex-1 flex-col bg-[#FFFAF0] lg:grid lg:grid-cols-2">
      <header className="relative z-20 flex min-h-[calc(76px+env(safe-area-inset-top))] shrink-0 items-center justify-between bg-[#FBF8F1] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_12px_28px_-22px_rgba(22,19,13,0.75)] lg:hidden">
        <button
          type="button"
          onClick={onLogoClick}
          className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-brand shadow-[0_8px_20px_rgba(228,86,42,0.22)]"
          title="Open home"
          aria-label="Open home"
        >
          <LogoMark className="size-7" />
        </button>
        <div className="ml-2.5 min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-black leading-tight tracking-[-0.015em]">
            Overview
          </h1>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-[#8A7A68]">
            {trip.name} · {days.length} {days.length === 1 ? "day" : "days"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-[#D8CEB8] bg-[#F8F4EC] text-[#6a6353] shadow-sm"
          title="Edit trip settings"
          aria-label="Edit trip settings"
        >
          <Pencil className="size-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:p-10">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="absolute right-5 top-5 hidden size-9 place-items-center rounded-full border border-[#E7DFCE] bg-[#FBF8F1] text-[#6a6353] shadow-sm transition-colors hover:bg-[#FBE7DD] hover:text-[#E4562A] md:right-10 md:top-10 md:grid"
          title="Edit trip settings"
        >
          <Pencil className="size-4" />
        </button>

        <div className="mb-5 flex items-start justify-between md:mb-[26px]">
          <div className="min-w-0">
            <div className="mb-[7px] hidden font-['Hanken_Grotesk'] text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#a89f88] md:block">
              Trip overview
            </div>
            <h1 className="m-0 hidden truncate font-['Bricolage_Grotesque'] text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#16130D] md:block">
              {trip.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-['Hanken_Grotesk'] text-sm font-medium text-[#6a6353]">
              <span className="inline-flex items-center gap-[7px]">
                <span className="size-2 rounded-full bg-[#E4562A]" />
                {routeStart} → {routeEnd}
              </span>
              {dateRange && (
                <>
                  <span className="text-[#cbc1a9]">·</span>
                  <span>{dateRange}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="mt-4">
          <FuelOverviewCard plan={fuelPlan} vehicle={fuelVehicle} />
        </div>

        <div className="mt-4">
          <TheRouteCard
            days={days}
            stays={stays}
            stopCount={stopCount}
            onSelectDay={onSelectDay}
          />
        </div>

        <div className="mt-4">
          <TeamCard trip={trip} currentUserId={currentUserId} people={people} />
        </div>
      </div>

      <section className="relative hidden min-h-[400px] lg:block">
        <MapView stops={overviewMapStops} stopColors={stopColors} />
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

function TheRouteCard({
  days,
  stays,
  stopCount,
  onSelectDay,
}: {
  days: TripPlain["days"];
  stays: TripStayPlain[];
  stopCount: number;
  onSelectDay: (dayId: string) => void;
}) {
  const routeStops = days.flatMap((day, dayIndex) => {
    const dayLabel = day.name || `Day ${dayIndex + 1}`;
    const points = day.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      region: stopRegion(stop.address),
      dayLabel,
      dayId: day.id,
      isStay: false,
    }));
    const stay = stays.find((item) => item.afterDayId === day.id);
    if (stay && stay.stayType !== "driving_overnight") {
      points.push({
        id: `stay-overview-${stay.id}`,
        name: stay.name,
        region: stopRegion(stay.address),
        dayLabel,
        dayId: day.id,
        isStay: true,
      });
    }
    return points;
  });
  const [expanded, setExpanded] = useState(false);
  const visibleStops = expanded ? routeStops : routeStops.slice(0, 5);
  const hiddenStops = Math.max(routeStops.length - visibleStops.length, 0);

  return (
    <div className="rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6 shadow-sm">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="m-0 font-['Bricolage_Grotesque'] text-[19px] font-bold tracking-[-0.02em]">
          The route
        </h2>
        <span className="text-[12.5px] font-semibold text-[#8a8270]">
          {stopCount} {stopCount === 1 ? "stop" : "stops"} · {days.length}{" "}
          {days.length === 1 ? "day" : "days"}
        </span>
      </div>

      {routeStops.length > 0 ? (
        <div>
          {visibleStops.map((stop, index) => {
            const pin = routePinColor(index);
            const tag = stop.isStay
              ? "Night"
              : routeStopTag(index, routeStops.length);
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => onSelectDay(stop.dayId)}
                title={`Open ${stop.dayLabel} in the planner`}
                className="flex w-full gap-4 rounded-xl text-left transition-colors hover:bg-[#fffaf0]"
              >
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className="grid size-[30px] place-items-center rounded-full font-mono text-[13px] font-bold text-white"
                    style={{
                      background: pin.color,
                      boxShadow: `0 4px 10px -4px ${pin.color}`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-h-[26px] w-0.5 flex-1 bg-[repeating-linear-gradient(#d8cfb9_0_4px,transparent_4px_9px)]" />
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex items-center gap-[9px]">
                    <span className="text-[15.5px] font-bold">{stop.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em]"
                      style={{ color: pin.color, background: pin.soft }}
                    >
                      {tag}
                    </span>
                  </div>
                  <div className="mt-[3px] text-[12.5px] font-medium text-[#948b76]">
                    {stop.region} · {stop.dayLabel}
                  </div>
                </div>
              </button>
            );
          })}

          {routeStops.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-1 w-full rounded-[14px] border border-[#E7DFCE] bg-[#fffaf0] px-4 py-3 text-sm font-bold text-[#E4562A] transition-colors hover:bg-[#FBE7DD]"
            >
              {expanded ? "Show less" : `Show more (${hiddenStops})`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm font-medium text-[#948b76]">
          Add stops in Planner to build the route.
        </p>
      )}
    </div>
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
      <div className="rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-['Bricolage_Grotesque'] text-[19px] font-bold tracking-[-0.02em]">
            Team
          </h2>
          <span className="text-[12.5px] font-semibold text-[#8a8270]">
            {people.length} {people.length === 1 ? "person" : "people"}
          </span>
        </div>

        <div className="mt-4 flex items-center">
          {people.slice(0, 6).map((person, index) => (
            <span
              key={person.id}
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 border-[#FBF8F1] text-sm font-black text-white shadow-sm",
                index > 0 && "-ml-2",
                index % 3 === 0 && "bg-[#16130D]",
                index % 3 === 1 && "bg-[#E4562A]",
                index % 3 === 2 && "bg-[#2E7A57]",
              )}
              title={`${person.label} · ${person.detail}`}
            >
              {getInitials(person.label)}
            </span>
          ))}
          {people.length > 6 && (
            <span className="-ml-2 grid size-10 place-items-center rounded-full border-2 border-[#FBF8F1] bg-[#EBE4D3] text-xs font-black text-[#8a8270] shadow-sm">
              +{people.length - 6}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-2 grid size-10 place-items-center rounded-full border-2 border-[#FBF8F1] bg-[#fffaf0] text-[#E4562A] shadow-sm ring-1 ring-[#E7DFCE] hover:bg-[#FBE7DD]"
            title="Manage team"
          >
            <UserPlus className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex items-center gap-2 text-sm font-black text-[#E4562A] hover:underline"
        >
          <Users className="size-4" />
          Manage team
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
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
            <form onSubmit={addMember} className="mt-2 flex gap-2">
              <input
                value={memberIdentifier}
                onChange={(event) => setMemberIdentifier(event.target.value)}
                placeholder="Email or username"
                className="min-w-0 flex-1 rounded-xl border border-[#E7DFCE] bg-[#fffaf0] px-3 py-2 text-sm font-semibold outline-none ring-[#E4562A]/30 placeholder:text-[#948b76] focus:ring-2"
              />
              <button
                type="submit"
                disabled={isSavingMember || !memberIdentifier.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E4562A] text-white hover:bg-[#cf4822] disabled:opacity-50"
                title="Add team member"
              >
                <UserPlus className="size-4" />
              </button>
            </form>
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
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[#FBF8F1] px-3 py-2.5">
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

      <div className="flex shrink-0 items-center gap-2">
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

function StatCard({ label, value, sub, color }: StatCardData) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[#E7DFCE] bg-[#FBF8F1] px-[17px] py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="truncate text-[12px] font-semibold text-[#8a8270]">
          {label}
        </span>
        <span
          className="size-2 shrink-0 rounded-sm"
          style={{ background: color }}
        />
      </div>
      <div className="truncate font-mono text-[20px] font-bold leading-none tracking-[-0.02em]">
        {value}
      </div>
      <div className="mt-1.5 truncate text-[11.5px] font-medium text-[#a89f88]">
        {sub}
      </div>
    </div>
  );
}

type StatCardData = {
  label: string;
  value: string;
  sub: string;
  color: string;
};

const ROUTE_PINS = [
  { color: "#E4562A", soft: "#FBE7DD" },
  { color: "#2E7A57", soft: "#E1EFE7" },
  { color: "#6E9BC0", soft: "#E8F0F6" },
] as const;

function routePinColor(index: number) {
  return ROUTE_PINS[index % ROUTE_PINS.length];
}

function routeStopTag(index: number, count: number) {
  if (index === 0) return "Start";
  if (index === count - 1) return "End";
  return "Stop";
}

function stopRegion(address: string | null) {
  if (!address) return "Route stop";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.at(-2) ?? parts.at(-1) ?? "Route stop";
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

function formatTripDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
