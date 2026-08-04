"use client";

import Link from "next/link";
import {
  CarFront,
  Check,
  ChevronDown,
  LayoutGrid,
  MapPinned,
  Plus,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { NewTripDialog } from "@/features/trips/components/new-trip-dialog";
import { cn } from "@/lib/utils";

export type SidebarTripItem = {
  id: string;
  name: string;
  heroImageUrl: string | null;
};

type CollapsedSidebarProps = {
  userFullName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  onLogoClick?: () => void;
  onProfileClick?: () => void;
  /** When provided, renders a scrollable list of trip thumbnails below the logo, separated by a divider. */
  trips?: SidebarTripItem[];
  activeTripId?: string;
  onSelectTrip?: (tripId: string) => void;
};

export function CollapsedSidebar({
  userAvatarUrl,
  onLogoClick,
  onProfileClick,
  trips,
  activeTripId,
  onSelectTrip,
}: CollapsedSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [tripMenuOpen, setTripMenuOpen] = useState(false);
  const tripMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!tripMenuRef.current?.contains(event.target as Node)) {
        setTripMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTripMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [tripMenuOpen]);

  const logo = (
    <AppLogo className="transition-transform hover:-translate-y-px [&_img]:!h-10" />
  );

  const profile = (
    <span className="grid size-10 place-items-center overflow-hidden rounded-[12px] bg-brand text-brand-foreground shadow-[0_7px_18px_rgba(228,86,42,0.24)] ring-1 ring-[#D94E25] transition-all hover:-translate-y-px hover:bg-[#CF4822]">
      {userAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={userAvatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound className="size-[18px]" strokeWidth={2.2} />
      )}
    </span>
  );
  const activeTrip = trips?.find((trip) => trip.id === activeTripId);

  return (
    <aside className="relative z-[1000] hidden h-[68px] w-full shrink-0 items-center border-b border-[#E4DBC8] bg-[#FBF8F1] px-5 py-3 shadow-[0_8px_22px_-18px_rgba(22,19,13,0.55)] md:flex">
      {onLogoClick ? (
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 rounded-[10px]"
          aria-label="Open home"
          title="Tripzo"
        >
          {logo}
        </button>
      ) : (
        <Link
          href="/"
          className="shrink-0 rounded-[10px]"
          aria-label="Open home"
          title="Tripzo"
        >
          {logo}
        </Link>
      )}

      {trips && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-[14px] border border-[#E2D8C6] bg-[#EEE7DA]/80 p-1 shadow-[0_4px_14px_rgba(22,19,13,0.06)]">
          <ComingSoonMenuItem icon={LayoutGrid} label="All trips" />
          <ComingSoonMenuItem icon={CarFront} label="Vehicles" />
          <div ref={tripMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setTripMenuOpen((open) => !open)}
              aria-expanded={tripMenuOpen}
              aria-haspopup="menu"
              aria-controls="trip-switcher-menu"
              className="flex h-9 max-w-[min(34vw,320px)] items-center gap-2 rounded-[10px] bg-[#FFFCF6] px-3 text-[11px] font-black text-[#302B23] shadow-sm outline-none transition-all hover:bg-white focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <MapPinned className="size-3.5 shrink-0 text-[#C94B25]" />
              <span className="truncate">{activeTrip?.name ?? "Trips"}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-[#9A917F] transition-transform duration-200",
                  tripMenuOpen && "rotate-180",
                )}
              />
            </button>
            {tripMenuOpen && (
              <nav
                id="trip-switcher-menu"
                aria-label="Switch trip"
                className="absolute left-0 top-[calc(100%+10px)] w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[18px] border border-[#DED3C0] bg-[#FFFCF6] p-2.5 shadow-[0_22px_55px_-10px_rgba(22,19,13,0.28)]"
              >
                <div className="max-h-[min(55vh,340px)] space-y-1 overflow-y-auto overscroll-contain">
                  {trips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      prefetch={false}
                      onClick={() => {
                        onSelectTrip?.(trip.id);
                        setTripMenuOpen(false);
                      }}
                      title={trip.name}
                      aria-current={
                        trip.id === activeTripId ? "page" : undefined
                      }
                      className={cn(
                        "flex min-w-0 items-center gap-2.5 rounded-[12px] px-3 py-3 text-[11px] font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand/35",
                        trip.id === activeTripId
                          ? "bg-[#FBE7DD] text-[#A93D1D]"
                          : "text-[#71695C] hover:bg-[#F3EDE2] hover:text-[#302B23]",
                      )}
                    >
                      <MapPinned className="size-4 shrink-0 opacity-65" />
                      <span className="truncate">{trip.name}</span>
                      {trip.id === activeTripId && (
                        <Check
                          className="ml-auto size-4 shrink-0"
                          strokeWidth={2.5}
                        />
                      )}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-brand px-3 text-[10.5px] font-black text-brand-foreground shadow-[0_5px_14px_rgba(228,86,42,0.2)] transition-colors hover:bg-[#CF4822]"
          >
            <Plus className="size-3.5" />
            New trip
          </button>
        </div>
      )}

      <div className="absolute right-5 shrink-0">
        {onProfileClick ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="rounded-[12px]"
            aria-label="Open profile"
            title="Profile"
          >
            {profile}
          </button>
        ) : (
          <Link
            href="/profile"
            className="rounded-[12px]"
            aria-label="Open profile"
            title="Profile"
          >
            {profile}
          </Link>
        )}
      </div>
      <NewTripDialog open={creating} onOpenChange={setCreating} />
    </aside>
  );
}

function ComingSoonMenuItem({
  icon: Icon,
  label,
}: {
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title={`${label} · Coming soon`}
      className="inline-flex h-9 shrink-0 cursor-default items-center gap-1.5 rounded-[10px] px-2.5 text-[10.5px] font-bold text-[#71695C] transition-colors hover:bg-[#E5DDCF] hover:text-[#302B23]"
    >
      <Icon className="size-3.5 text-[#9A765F]" />
      {label}
    </button>
  );
}
