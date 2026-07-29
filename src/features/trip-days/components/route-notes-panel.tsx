"use client";

import {
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
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
  const entryRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!focusEntryId) return;
    let scrollFrame = 0;
    const renderFrame = requestAnimationFrame(() => {
      scrollFrame = requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        const entry = entryRefs.current.get(focusEntryId);
        if (!container || !entry) return;

        const containerRect = container.getBoundingClientRect();
        const entryRect = entry.getBoundingClientRect();
        const centeredTop =
          container.scrollTop +
          entryRect.top -
          containerRect.top -
          (container.clientHeight - entryRect.height) / 2;

        container.scrollTo({
          top: Math.max(0, centeredTop),
          behavior: "smooth",
        });
      });
    });
    return () => {
      cancelAnimationFrame(renderFrame);
      cancelAnimationFrame(scrollFrame);
    };
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
              subtitle: stop.itemType === "activity" ? null : stop.address,
              notes: stop.description,
              kind: stop.itemType,
              onSave: (notes: string) => onUpdateStopNotes(stop.id, notes),
            })),
            ...(stay
              ? [
                  {
                    id: stay.id,
                    name: stay.name,
                    subtitle: null,
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
                        ref={(element) => {
                          if (element) {
                            entryRefs.current.set(entry.id, element);
                          } else {
                            entryRefs.current.delete(entry.id);
                          }
                        }}
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
  const parsedNote = parseNoteValue(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(parsedNote.text);
  const [saving, setSaving] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resolvingTitle, setResolvingTitle] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(parsedNote.text);
  }, [editing, parsedNote.text]);

  useEffect(() => {
    if (!addingLink || linkLabel.trim() || !normalizeHttpUrl(linkUrl)) return;
    const controller = new AbortController();
    setResolvingTitle(true);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/link-preview?url=${encodeURIComponent(linkUrl.trim())}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as { title?: unknown };
        if (typeof result.title === "string" && result.title.trim()) {
          const title = result.title.trim().slice(0, 100);
          setLinkLabel((current) => current || title);
        }
      } catch {
        // The user can still enter a name manually when preview fetching fails.
      } finally {
        if (!controller.signal.aborted) setResolvingTitle(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      setResolvingTitle(false);
    };
  }, [addingLink, linkLabel, linkUrl]);

  async function save() {
    setSaving(true);
    const success = await onSave(serializeNoteValue(draft, parsedNote.links));
    setSaving(false);
    if (success) setEditing(false);
  }

  async function addLink() {
    const url = normalizeHttpUrl(linkUrl);
    if (!url) {
      setLinkError("Enter a valid http:// or https:// address.");
      return;
    }
    const label =
      linkLabel.trim() || new URL(url).hostname.replace(/^www\./, "");
    if (parsedNote.links.length >= 12) {
      setLinkError("A note can have at most 12 links.");
      return;
    }

    setSaving(true);
    const success = await onSave(
      serializeNoteValue(parsedNote.text, [
        ...parsedNote.links,
        { label: label.slice(0, 100), url },
      ]),
    );
    setSaving(false);
    if (!success) return;
    setLinkLabel("");
    setLinkUrl("");
    setLinkError(null);
    setAddingLink(false);
  }

  async function removeLink(index: number) {
    setSaving(true);
    const success = await onSave(
      serializeNoteValue(
        parsedNote.text,
        parsedNote.links.filter((_, linkIndex) => linkIndex !== index),
      ),
    );
    setSaving(false);
    if (!success) setLinkError("Could not remove the link.");
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
              setDraft(parsedNote.text);
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
                setDraft(parsedNote.text);
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
    <div>
      <div className="mb-3">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAddingLink((current) => !current);
              setLinkError(null);
            }}
            disabled={saving}
            aria-expanded={addingLink}
            className="flex items-center gap-1.5 rounded-[8px] px-1 py-1 text-[10px] font-black uppercase tracking-[.1em] text-[#9B927F] transition hover:bg-[#FBE7DD] hover:text-[#C6532D] disabled:opacity-50"
            title={addingLink ? "Close link form" : "Add link"}
          >
            <Link2 className="size-3.5" />
            Links
          </button>
        </div>

        {parsedNote.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedNote.links.map((link, index) => (
              <div
                key={`${link.url}-${index}`}
                className="group/link inline-flex min-w-0 max-w-full items-center rounded-[10px] border border-[#DDD3BF] bg-[#F7F1E5] shadow-[0_3px_9px_rgba(22,19,13,0.04)]"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-[#5F594D] transition hover:text-[#C6532D]"
                  title={link.url}
                >
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="size-3 shrink-0 opacity-60" />
                </a>
                <button
                  type="button"
                  onClick={() => void removeLink(index)}
                  disabled={saving}
                  className="mr-1 grid size-6 shrink-0 place-items-center rounded-[7px] text-[#A09680] opacity-70 transition hover:bg-white hover:text-[#C6532D] group-hover/link:opacity-100 disabled:opacity-40"
                  title={`Remove ${link.label}`}
                  aria-label={`Remove ${link.label}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {addingLink && (
          <div className="grid gap-2 rounded-[12px] border border-[#DDD3BF] bg-[#F8F3E9] p-2.5 sm:grid-cols-[minmax(160px,1fr)_auto]">
            <input
              value={linkUrl}
              maxLength={500}
              inputMode="url"
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addLink();
              }}
              placeholder="https://…"
              aria-label="Link address"
              className="h-9 min-w-0 rounded-[9px] border border-[#D8CEB8] bg-white px-2.5 font-mono text-xs text-[#403A2F] outline-none focus:ring-2 focus:ring-[#E4562A]/20"
            />
            <button
              type="button"
              onClick={() => void addLink()}
              disabled={saving || resolvingTitle}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-[#16130D] px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {resolvingTitle ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {resolvingTitle ? "Getting title…" : "Add"}
            </button>
          </div>
        )}
        {linkError && (
          <p className="mt-1.5 text-[11px] font-semibold text-[#C6532D]">
            {linkError}
          </p>
        )}
      </div>

      <div className="group/notes relative border-t border-[#E9E0CF] pr-9 pt-3">
        {parsedNote.text.trim() ? (
          <SafeMarkdown source={parsedNote.text} />
        ) : (
          <p className="text-sm italic text-[#B0A58D]">{emptyLabel}</p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute right-0 top-2 grid size-8 place-items-center rounded-[9px] text-[#9B927F] opacity-70 transition hover:bg-[#F0EADB] hover:text-[#5F594D] group-hover/notes:opacity-100"
          title="Edit notes"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

type NoteLink = {
  label: string;
  url: string;
};

const NOTE_LINKS_PREFIX = "<!--route-note-links:";
const NOTE_LINKS_SUFFIX = "-->";

function parseNoteValue(value: string): { text: string; links: NoteLink[] } {
  if (!value.startsWith(NOTE_LINKS_PREFIX)) return { text: value, links: [] };
  const metadataEnd = value.indexOf(NOTE_LINKS_SUFFIX);
  if (metadataEnd < 0) return { text: value, links: [] };

  try {
    const rawLinks = JSON.parse(
      value.slice(NOTE_LINKS_PREFIX.length, metadataEnd),
    );
    if (!Array.isArray(rawLinks)) return { text: value, links: [] };
    const links = rawLinks
      .map((link): NoteLink | null => {
        if (!link || typeof link !== "object") return null;
        const record = link as Record<string, unknown>;
        const label =
          typeof record.label === "string" ? record.label.trim() : "";
        const url =
          typeof record.url === "string" ? normalizeHttpUrl(record.url) : null;
        return label && url ? { label, url } : null;
      })
      .filter((link): link is NoteLink => link !== null)
      .slice(0, 12);
    const text = value.slice(metadataEnd + NOTE_LINKS_SUFFIX.length);
    return { text: text.replace(/^\r?\n/, ""), links };
  } catch {
    return { text: value, links: [] };
  }
}

function serializeNoteValue(text: string, links: NoteLink[]) {
  if (links.length === 0) return text;
  const metadata = `${NOTE_LINKS_PREFIX}${JSON.stringify(links)}${NOTE_LINKS_SUFFIX}\n`;
  return `${metadata}${text}`;
}

function normalizeHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
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
