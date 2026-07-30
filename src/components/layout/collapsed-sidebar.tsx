"use client";

import Link from "next/link";

import { LogoMark } from "@/components/shared/app-logo";
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
  userFullName,
  userEmail,
  userAvatarUrl,
  onLogoClick,
  onProfileClick,
  trips,
  activeTripId,
  onSelectTrip,
}: CollapsedSidebarProps) {
  const logo = (
    <span className="grid size-11 place-items-center rounded-[14px] bg-brand shadow-[0_10px_24px_rgba(228,86,42,0.26)] transition-transform hover:-translate-y-px">
      <LogoMark className="size-8" />
    </span>
  );

  const profile = (
    <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-[#16130D] text-sm font-black text-[#F3EDE1] shadow-[0_10px_24px_rgba(22,19,13,0.20)] ring-1 ring-[#E4DBC8] transition-transform hover:-translate-y-px">
      {userAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={userAvatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        getUserInitials(userFullName, userEmail)
      )}
    </span>
  );

  return (
    <aside className="z-[1000] hidden h-full w-[68px] shrink-0 border-r border-[#E4DBC8] bg-[#FBF8F1] px-3 py-4 md:flex md:flex-col md:items-center">
      {onLogoClick ? (
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 rounded-[16px]"
          aria-label="Open home"
          title="Milepost"
        >
          {logo}
        </button>
      ) : (
        <Link
          href="/"
          className="shrink-0 rounded-[16px]"
          aria-label="Open home"
          title="Milepost"
        >
          {logo}
        </Link>
      )}

      {trips && (
        <>
          <div className="my-3 h-px w-8 shrink-0 bg-[#E4DBC8]" />
          <nav className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-0.5">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                prefetch={false}
                onClick={() => onSelectTrip?.(trip.id)}
                title={trip.name}
                aria-label={trip.name}
                aria-current={trip.id === activeTripId ? "true" : undefined}
                className={cn(
                  "group relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#EBE4D3] shadow-sm transition-all hover:-translate-y-px",
                )}
              >
                {trip.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.heroImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black text-[#8a8270]">
                    {getTripInitials(trip.name)}
                  </span>
                )}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[14px] ring-2 ring-inset",
                    trip.id === activeTripId
                      ? "ring-brand"
                      : "ring-transparent group-hover:ring-[#D8CEB8]",
                  )}
                />
              </Link>
            ))}
          </nav>
        </>
      )}

      <div className={cn("shrink-0", trips ? "mt-3" : "mt-auto")}>
        {onProfileClick ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="rounded-full"
            aria-label="Open profile"
            title="Profile"
          >
            {profile}
          </button>
        ) : (
          <Link
            href="/profile"
            className="rounded-full"
            aria-label="Open profile"
            title="Profile"
          >
            {profile}
          </Link>
        )}
      </div>
    </aside>
  );
}

function getUserInitials(fullName?: string | null, email?: string | null) {
  const value = (fullName || email || "User").trim();
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ""}`.toUpperCase();
}

function getTripInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ""}`.toUpperCase();
}
