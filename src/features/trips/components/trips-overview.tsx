"use client";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CollapsedSidebar } from "@/components/layout/collapsed-sidebar";
import { NewTripDialog } from "@/features/trips/components/new-trip-dialog";

type TripOverviewItem = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  heroImageUrl: string | null;
  startDate: string | null;
  dayCount: number;
  stopCount: number;
  memberCount: number;
  updatedAt: string;
  firstStop: string | null;
  lastStop: string | null;
};

const coverGradients = [
  "from-[#204B3B] via-[#36765A] to-[#A3B98C]",
  "from-[#493025] via-[#A24D2C] to-[#E9A55F]",
  "from-[#243C52] via-[#547D91] to-[#C6B993]",
  "from-[#4B3D62] via-[#7C6B8D] to-[#D0A88A]",
];

function tripStatus(startDate: string | null, dayCount: number) {
  if (!startDate) return { label: "Draft", tone: "bg-white/85 text-[#5F584C]" };
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(dayCount - 1, 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today < start)
    return { label: "Upcoming", tone: "bg-[#E3F0E8] text-[#276848]" };
  if (today <= end)
    return { label: "On the road", tone: "bg-[#FBE7DD] text-[#B8431F]" };
  return { label: "Completed", tone: "bg-white/85 text-[#5F584C]" };
}

function formatDate(date: string | null) {
  if (!date) return "Dates not set";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function TripsOverview({
  trips,
  currentUserId,
  userAvatarUrl,
}: {
  trips: TripOverviewItem[];
  currentUserId: string;
  userAvatarUrl: string | null;
}) {
  const [creating, setCreating] = useState(false);
  const upcoming = trips.filter(
    (trip) => tripStatus(trip.startDate, trip.dayCount).label === "Upcoming",
  ).length;
  const totalStops = trips.reduce((sum, trip) => sum + trip.stopCount, 0);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F3EDE1] text-[#16130D]">
      <CollapsedSidebar
        userAvatarUrl={userAvatarUrl}
        trips={trips}
        onProfileClick={() => {
          window.location.href = "/profile";
        }}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <section className="relative overflow-hidden border-b border-[#DED3C0] bg-[#16130D] text-[#FFF9EF]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.065)_1px,transparent_1px)] bg-[length:22px_22px]" />
          <div className="pointer-events-none absolute -right-28 -top-40 size-[430px] rounded-full bg-[#E4562A]/25 blur-[85px]" />
          <div className="relative mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.13em] text-[#D7CCBA]">
                  <Sparkles className="size-3.5 text-[#F17A54]" /> Your travel
                  library
                </div>
                <h1 className="font-['Bricolage_Grotesque'] text-[44px] font-extrabold leading-none tracking-[-.045em] sm:text-[58px]">
                  All your trips.
                  <br />
                  <span className="text-[#F17A54]">One place.</span>
                </h1>
                <p className="mt-5 max-w-[590px] text-sm font-medium leading-relaxed text-white/55 sm:text-base">
                  Pick up where you left off, revisit an old route, or start
                  planning the next adventure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-[13px] bg-brand px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(228,86,42,.3)] transition hover:-translate-y-px hover:bg-[#CF4822] md:self-auto"
              >
                <Plus className="size-4" /> New trip
              </button>
            </div>

            {trips.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-xs font-bold text-white/45">
                <span>
                  <strong className="mr-1.5 font-mono text-lg text-white">
                    {trips.length}
                  </strong>{" "}
                  trips
                </span>
                <span>
                  <strong className="mr-1.5 font-mono text-lg text-white">
                    {upcoming}
                  </strong>{" "}
                  upcoming
                </span>
                <span>
                  <strong className="mr-1.5 font-mono text-lg text-white">
                    {totalStops}
                  </strong>{" "}
                  places saved
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
          {trips.length === 0 ? (
            <EmptyState onCreate={() => setCreating(true)} />
          ) : (
            <>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#A24D2C]">
                    Your collection
                  </p>
                  <h2 className="mt-1 font-['Bricolage_Grotesque'] text-2xl font-extrabold tracking-[-.03em]">
                    Ready when you are
                  </h2>
                </div>
                <p className="hidden text-xs font-semibold text-[#8A8270] sm:block">
                  Recently updated first
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {trips.map((trip, index) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={index}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <NewTripDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function TripCard({
  trip,
  index,
  currentUserId,
}: {
  trip: TripOverviewItem;
  index: number;
  currentUserId: string;
}) {
  const status = tripStatus(trip.startDate, trip.dayCount);
  const routeLabel =
    trip.firstStop && trip.lastStop
      ? trip.firstStop === trip.lastStop
        ? trip.firstStop
        : `${trip.firstStop} → ${trip.lastStop}`
      : "Route waiting to be planned";

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group overflow-hidden rounded-[22px] border border-[#DED3C0] bg-[#FFFCF6] shadow-[0_8px_28px_rgba(22,19,13,.06)] transition duration-300 hover:-translate-y-1 hover:border-[#C8BBA2] hover:shadow-[0_18px_42px_rgba(22,19,13,.13)]"
    >
      <div
        className={`relative h-[190px] overflow-hidden bg-gradient-to-br ${coverGradients[index % coverGradients.length]}`}
      >
        {trip.heroImageUrl && (
          <Image
            src={trip.heroImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/10" />
        {!trip.heroImageUrl && (
          <Route
            className="absolute -bottom-6 -right-5 size-36 rotate-[-12deg] text-white/10"
            strokeWidth={1.2}
          />
        )}
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[.09em] shadow-sm backdrop-blur ${status.tone}`}
          >
            {status.label}
          </span>
          {trip.ownerId !== currentUserId && (
            <span className="rounded-full bg-black/35 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.08em] text-white backdrop-blur">
              Shared
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-xs font-bold text-white/85">
          <MapPin className="size-3.5 shrink-0 text-[#F6A386]" />
          <span className="truncate">{routeLabel}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-['Bricolage_Grotesque'] text-[22px] font-extrabold tracking-[-.025em] text-[#211D17]">
              {trip.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#8A8270]">
              <CalendarDays className="size-3.5 text-[#B45A3C]" />{" "}
              {formatDate(trip.startDate)}
            </p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F3EDE1] text-[#A24D2C] transition group-hover:bg-brand group-hover:text-white">
            <ArrowRight className="size-4" />
          </span>
        </div>
        {trip.description && (
          <p className="mt-4 line-clamp-2 text-sm font-medium leading-5 text-[#71695C]">
            {trip.description}
          </p>
        )}
        <div className="mt-5 grid grid-cols-3 divide-x divide-[#E7DFCE] border-t border-[#E7DFCE] pt-4 text-center">
          <Stat icon={CalendarDays} value={trip.dayCount} label="days" />
          <Stat icon={MapPin} value={trip.stopCount} label="stops" />
          <Stat icon={Users} value={trip.memberCount} label="travelers" />
        </div>
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof MapPin;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-1">
      <Icon className="size-3.5 text-[#B45A3C]" />
      <span className="font-mono text-xs font-black">{value}</span>
      <span className="hidden text-[10px] font-bold text-[#9A917F] min-[420px]:inline sm:hidden lg:inline">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-dashed border-[#CDBFA6] bg-[#FFFCF6] px-6 py-16 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-[18px] bg-[#FBE7DD] text-brand">
        <Route className="size-7" />
      </div>
      <h2 className="mt-5 font-['Bricolage_Grotesque'] text-3xl font-extrabold tracking-[-.035em]">
        Your next road starts here.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-[#71695C]">
        Create a trip, add a few places, and turn that loose idea into a route
        you can actually follow.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-[12px] bg-brand px-5 text-sm font-black text-white hover:bg-[#CF4822]"
      >
        <Plus className="size-4" /> Create your first trip
      </button>
      <Clock3
        className="absolute -bottom-10 -right-8 size-40 text-[#E7DFCE]/50"
        strokeWidth={1}
      />
    </div>
  );
}
