"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type {
  TripDayPlain,
  TripStayPlain,
} from "@/features/trips/lib/trip-view-model";

export function RouteNotesPanel({
  days,
  stays,
  focusEntryId,
  focusRequest,
  showDayHeadings = false,
  onUpdateDayNotes,
  onUpdateStopNotes,
  onUpdateStayNotes,
}: {
  days: TripDayPlain[];
  stays: TripStayPlain[];
  focusEntryId?: string;
  focusRequest?: number;
  showDayHeadings?: boolean;
  onUpdateDayNotes: (dayId: string, notes: string) => Promise<boolean>;
  onUpdateStopNotes: (stopId: string, notes: string) => Promise<boolean>;
  onUpdateStayNotes: (stayId: string, notes: string) => Promise<boolean>;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusEntryId) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`route-note-${focusEntryId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusEntryId, focusRequest]);

  if (days.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-[#F8F5ED] p-8 text-center">
        <p className="text-sm font-semibold text-[#8A8270]">
          Add a day to start collecting route notes.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto bg-[#F8F5ED] px-6 pb-28 pt-7 md:px-8"
    >
      <div className="mx-auto max-w-[720px]">
        {days.map((day, dayIndex) => {
          const stay = stays.find((item) => item.afterDayId === day.id);
          const entries = [
            ...day.stops.map((stop) => ({
              id: stop.id,
              name: stop.name,
              subtitle:
                stop.itemType === "activity" ? "Activity" : stop.address,
              notes: stop.description,
              kind: stop.itemType,
              onSave: (notes: string) => onUpdateStopNotes(stop.id, notes),
            })),
            ...(stay
              ? [
                  {
                    id: stay.id,
                    name: stay.name,
                    subtitle: "Overnight",
                    notes: stay.notes,
                    kind: "overnight" as const,
                    onSave: (notes: string) =>
                      onUpdateStayNotes(stay.id, notes),
                  },
                ]
              : []),
          ];

          return (
            <section
              key={day.id}
              className={
                dayIndex > 0 ? "mt-10 border-t border-[#E3DAC7] pt-8" : ""
              }
            >
              {showDayHeadings && (
                <div className="mb-5">
                  <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#B0A58D]">
                    Day {dayIndex + 1}
                  </div>
                  <h2 className="mt-1 font-['Bricolage_Grotesque'] text-2xl font-extrabold tracking-[-0.025em] text-[#16130D]">
                    {day.name || "Route notes"}
                  </h2>
                </div>
              )}

              <article className="mb-7 rounded-[18px] border border-[#E3DAC7] bg-[#FFFDF8] p-5 shadow-sm">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[.12em] text-[#B05D40]">
                  Day overview
                </div>
                <EditableMarkdown
                  value={day.notes ?? ""}
                  emptyLabel="Add an overview for this day."
                  onSave={(notes) => onUpdateDayNotes(day.id, notes)}
                />
              </article>

              {entries.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#D8CEB8] p-8 text-center text-sm font-semibold text-[#9B927F]">
                  No stops or notes in this day yet.
                </div>
              ) : (
                <ol>
                  {entries.map((entry, index) => {
                    const markerStyle =
                      entry.kind === "activity"
                        ? {
                            background: "#7C5CBF",
                            boxShadow: "0 7px 18px rgba(124,92,191,.28)",
                          }
                        : entry.kind === "overnight"
                          ? {
                              background: "#6E9BC0",
                              boxShadow: "0 7px 18px rgba(110,155,192,.28)",
                            }
                          : index === 0
                            ? {
                                background: "#16130D",
                                boxShadow: "0 7px 18px rgba(22,19,13,.2)",
                              }
                            : {
                                background: "#E4562A",
                                boxShadow: "0 7px 18px rgba(228,86,42,.28)",
                              };
                    return (
                      <li
                        key={entry.id}
                        id={`route-note-${entry.id}`}
                        className={
                          "relative grid scroll-mt-24 grid-cols-[40px_minmax(0,1fr)] gap-4 rounded-[16px] pb-8 transition-colors last:pb-0 " +
                          (focusEntryId === entry.id
                            ? "-mx-3 bg-[#FBE7DD]/45 px-3 pt-3"
                            : "")
                        }
                      >
                        {index < entries.length - 1 && (
                          <span className="absolute left-[19px] top-9 h-[calc(100%-28px)] w-px bg-[#DDD3BF]" />
                        )}
                        <span
                          className="relative z-[1] grid size-10 place-items-center rounded-[12px] font-['JetBrains_Mono'] text-xs font-bold text-white"
                          style={markerStyle}
                        >
                          {index + 1}
                        </span>
                        <article className="min-w-0 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-['Bricolage_Grotesque'] text-xl font-extrabold tracking-[-0.02em] text-[#16130D]">
                              {entry.name}
                            </h3>
                            <span className="rounded-full bg-[#EEE7D9] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em] text-[#7A7264]">
                              {entry.kind}
                            </span>
                          </div>
                          {entry.subtitle && (
                            <p className="mt-0.5 truncate font-['JetBrains_Mono'] text-xs text-[#A09680]">
                              {entry.subtitle}
                            </p>
                          )}
                          <div className="mt-3">
                            <EditableMarkdown
                              value={entry.notes ?? ""}
                              emptyLabel="Add notes for this place."
                              onSave={entry.onSave}
                            />
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EditableMarkdown({
  value,
  emptyLabel,
  onSave,
}: {
  value: string;
  emptyLabel: string;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  async function save() {
    setSaving(true);
    const success = await onSave(draft);
    setSaving(false);
    if (success) setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <textarea
          autoFocus
          value={draft}
          maxLength={6000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              void save();
            }
            if (event.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          placeholder="Write Markdown…"
          className="min-h-40 w-full resize-y rounded-[12px] border border-[#D8CEB8] bg-white p-3 font-mono text-xs leading-relaxed text-[#403A2F] outline-none focus:ring-2 focus:ring-[#E4562A]/20"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-medium text-[#A09680]">
            Markdown · ⌘/Ctrl + Enter to save
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
              disabled={saving}
              className="grid size-8 place-items-center rounded-[9px] text-[#8A8270] hover:bg-[#F0EADB]"
              title="Cancel"
            >
              <X className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-[#16130D] px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              <Check className="size-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/notes relative pr-9">
      {value.trim() ? (
        <SafeMarkdown source={value} />
      ) : (
        <p className="text-sm italic text-[#B0A58D]">{emptyLabel}</p>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="absolute right-0 top-0 grid size-8 place-items-center rounded-[9px] text-[#9B927F] opacity-70 transition hover:bg-[#F0EADB] hover:text-[#5F594D] group-hover/notes:opacity-100"
        title="Edit notes"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}

function SafeMarkdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-[#5F594D]">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={index}
              className="pt-1 text-sm font-extrabold text-[#282319]"
            >
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const content = trimmed.replace(/^#{1,2}\s+/, "");
          return (
            <h4
              key={index}
              className="pt-1 text-base font-extrabold text-[#282319]"
            >
              {renderInline(content)}
            </h4>
          );
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="mt-[9px] size-1 shrink-0 rounded-full bg-[#E4562A]" />
              <span>{renderInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }
        const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
        if (ordered) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="font-mono text-xs font-bold text-[#E4562A]">
                {trimmed.match(/^\d+/)?.[0]}.
              </span>
              <span>{renderInline(ordered[1])}</span>
            </div>
          );
        }
        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInline(value: string): ReactNode {
  const tokens = value.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return tokens.map((token, index) => {
    const bold = token.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[#C6532D] underline decoration-[#E7B39F] underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return token;
  });
}
