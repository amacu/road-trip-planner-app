"use client";

import {
  BedDouble,
  CarFront,
  ChevronDown,
  Moon,
  Route,
  TentTree,
} from "lucide-react";
import { useState } from "react";

import { StayDialog } from "@/features/trip-stays/components/stay-card";
import type { TripStayPlain } from "@/features/trips/lib/trip-view-model";
import type { TripStayInput } from "@/lib/validators/trip-stay";

const STAY_SUMMARY_TYPES = [
  {
    type: "hotel",
    label: "Hotel",
    icon: BedDouble,
    color: "#55747B",
    bg: "#E2EAE8",
  },
  {
    type: "tent",
    label: "Tent",
    icon: TentTree,
    color: "#58705A",
    bg: "#E3E9DC",
  },
  {
    type: "car",
    label: "Car",
    icon: CarFront,
    color: "#A3573D",
    bg: "#F0E0D4",
  },
  {
    type: "driving_overnight",
    label: "Overnight drive",
    icon: Route,
    color: "#74613E",
    bg: "#EAE1CF",
  },
] as const;

const STAY_STATUS_STYLES: Record<string, { label: string; className: string }> =
  {
    booked: {
      label: "Booked",
      className: "bg-[#E1EFE7] text-[#276848]",
    },
    paid: {
      label: "Paid",
      className: "bg-[#E2EAE8] text-[#45686F]",
    },
    planned: {
      label: "Planned",
      className: "bg-[#F0E0D4] text-[#A3573D]",
    },
  };

export function StaySummary({
  stays,
  onSave,
  onDelete,
}: {
  stays: TripStayPlain[];
  onSave?: (input: TripStayInput) => Promise<boolean>;
  onDelete?: (stayId: string) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const booked = stays.filter(
    (stay) => stay.status === "booked" || stay.status === "paid",
  ).length;
  const totalCost = stays.reduce((sum, stay) => sum + (stay.price ?? 0), 0);
  const summaryCurrency =
    stays.find((stay) => stay.price != null)?.currency ?? "PLN";
  const stayTypesWithNights = STAY_SUMMARY_TYPES.map((stayType) => ({
    ...stayType,
    count: stays.filter((stay) => stay.stayType === stayType.type).length,
  })).filter(({ count }) => count > 0);

  return (
    <section className="mb-[22px] rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-6">
      <div
        className={`relative flex flex-wrap items-start justify-between gap-3 ${
          collapsed ? "" : "mb-5"
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand nights" : "Collapse nights"}
          className="absolute inset-0 z-0 cursor-pointer rounded-[16px]"
        />
        <div className="pointer-events-none relative z-[1]">
          <div className="mb-1 flex items-center gap-2">
            <Moon className="size-4 text-[#6E9BC0]" />
            <h2 className="font-['Bricolage_Grotesque'] text-lg font-bold tracking-[-0.02em]">
              Nights
            </h2>
          </div>
          <p className="text-[13px] font-medium text-[#8a8270]">
            Accommodation across the whole trip
          </p>
        </div>
        <div className="pointer-events-none relative z-[1] flex items-center gap-3">
          <div className="text-right">
            <div className="font-['JetBrains_Mono'] text-3xl font-bold leading-none text-[#16130D]">
              {stays.length}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[#948b76]">
              nights planned
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand nights" : "Collapse nights"}
            className="pointer-events-auto grid size-10 place-items-center rounded-[13px] border border-[#D8CEB8] text-[#6A6353] hover:bg-[#F0EADB]"
          >
            <ChevronDown
              className={`size-4 transition-transform ${
                collapsed ? "-rotate-90" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
            {stayTypesWithNights.map(
              ({ type, label, icon: Icon, color, bg, count }) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-[15px] bg-[#F3EFE4] px-4 py-3.5"
                >
                  <div
                    className="grid size-10 shrink-0 place-items-center rounded-[10px]"
                    style={{ color, background: bg }}
                  >
                    <Icon className="size-[18px]" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.08em] text-[#7a7264]">
                      {label}
                    </div>
                    <div className="mt-1.5 font-['JetBrains_Mono'] text-[22px] font-bold leading-none tracking-[-0.04em] text-[#16130D]">
                      {count}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          {stays.length > 0 && (
            <div className="mt-4 border-t border-[#E7DFCE]">
              <button
                type="button"
                onClick={() => setDetailsExpanded((current) => !current)}
                aria-expanded={detailsExpanded}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-[13px] font-bold text-[#7a7264]"
              >
                <span>
                  {booked} of {stays.length} booked or paid
                </span>
                <span className="flex items-center gap-2">
                  <span>
                    {Math.round(totalCost).toLocaleString("pl-PL")}{" "}
                    {summaryCurrency} accommodation
                  </span>
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      detailsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              {detailsExpanded && (
                <div className="border-t border-[#E7DFCE]">
                  {stays.map((stay, index) => {
                    const stayType =
                      STAY_SUMMARY_TYPES.find(
                        ({ type }) => type === stay.stayType,
                      ) ?? STAY_SUMMARY_TYPES[0];
                    const status =
                      STAY_STATUS_STYLES[stay.status] ??
                      STAY_STATUS_STYLES.planned;
                    const Icon = stayType.icon;

                    return (
                      <button
                        type="button"
                        key={stay.id}
                        onClick={() => {
                          if (onSave && onDelete) setSelectedStayId(stay.id);
                        }}
                        className={`flex w-full items-center gap-3 border-b border-[#E7DFCE] py-3.5 text-left last:border-b-0 ${
                          onSave && onDelete
                            ? "cursor-pointer transition-colors hover:bg-[#F6F1E7]"
                            : "cursor-default"
                        }`}
                      >
                        <div
                          className="grid size-10 shrink-0 place-items-center rounded-[11px]"
                          style={{
                            color: stayType.color,
                            background: stayType.bg,
                          }}
                        >
                          <Icon className="size-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-[#16130D]">
                            {stay.name}
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-[#948b76]">
                            Night {index + 1} · {stayType.label}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#5F594D]">
                            {stay.price == null
                              ? "—"
                              : `${stay.price.toLocaleString("pl-PL")} ${stay.currency}`}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedStayId && onSave && onDelete && (
            <StayDialog
              key={selectedStayId}
              open
              onOpenChange={(open) => {
                if (!open) setSelectedStayId(null);
              }}
              dayId={
                stays.find((stay) => stay.id === selectedStayId)?.afterDayId ??
                ""
              }
              stay={stays.find((stay) => stay.id === selectedStayId)}
              previousStay={
                stays[stays.findIndex((stay) => stay.id === selectedStayId) - 1]
              }
              onSave={onSave}
              onDelete={() => onDelete(selectedStayId)}
            />
          )}
        </>
      )}
    </section>
  );
}
