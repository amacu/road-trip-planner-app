"use client";

import { Clock3, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { geocode } from "@/lib/geocode-client";
import type { GeocodeResult } from "@/lib/integrations/geocode";
import { cn } from "@/lib/utils";

export function AddStopBox({
  onAdd,
  onClose,
  placeholder = "Search a place or paste a Google Maps link",
  helpText = "Or click anywhere on the map to drop a pin.",
  embedded = false,
  onAddWithoutLocation,
}: {
  onAdd: (result: GeocodeResult) => void;
  onClose?: () => void;
  placeholder?: string;
  helpText?: string;
  embedded?: boolean;
  onAddWithoutLocation?: (name: string, visitDurationMin: number) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [manualDuration, setManualDuration] = useState("01:00");

  useEffect(() => {
    const query = q.trim();
    const looksLikeCoordinates = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(query);
    const looksLikeMapsLink = query.includes("maps") || query.includes("@");

    if (
      !query ||
      (query.length < 3 && !looksLikeCoordinates && !looksLikeMapsLink)
    ) {
      setLoading(false);
      setResults([]);
      setErr(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setErr(null);
      geocode(query, controller.signal)
        .then((r) => {
          setResults(r);
          if (r.length === 0) setErr("No results. Try a different query.");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setErr("Search failed. Try again.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  function pick(result: GeocodeResult) {
    onAdd(result);
    setQ("");
    setResults([]);
  }

  function addWithoutLocation() {
    const name = q.trim();
    if (!name || !onAddWithoutLocation) return;
    const [hours, minutes] = manualDuration.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const duration = Number.isFinite(totalMinutes)
      ? Math.max(1, totalMinutes)
      : 60;
    onAddWithoutLocation(name, duration);
    setQ("");
    setResults([]);
  }

  return (
    <div
      className={cn(
        embedded
          ? ""
          : "mb-3 rounded-[18px] border border-[#DED3C0] bg-[#F8F4EC] p-3 shadow-[0_6px_18px_rgba(22,19,13,0.06)]",
      )}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8F8675]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) pick(results[0]);
            }}
            placeholder={placeholder}
            className="h-11 w-full rounded-[13px] border border-[#D8CEB8] bg-[#FFFCF6] pl-10 pr-9 text-[13px] font-semibold text-foreground outline-none transition placeholder:font-medium placeholder:text-[#A89F88] focus:border-brand/45 focus:ring-2 focus:ring-brand/10"
          />
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-[12px] text-[#8F8675] transition-colors hover:bg-[#EEE7DA] hover:text-foreground"
            title="Close"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {helpText && (
        <p className="mt-2 px-1 text-[10.5px] font-medium text-[#9A917F]">
          {helpText}
        </p>
      )}

      {onAddWithoutLocation && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#D8CDE8] bg-[#F3EFF8] p-2">
          <span className="min-w-0 flex-1 px-1 text-[11px] font-bold text-[#6C4FA8]">
            {q.trim()
              ? `Add “${q.trim()}” without a map location`
              : "Add an activity without a map location"}
          </span>
          <label className="flex h-8 items-center gap-1.5 rounded-[9px] bg-white/75 px-2 text-[#776893]">
            <Clock3 className="size-3.5" />
            <input
              type="time"
              value={manualDuration}
              onChange={(event) => setManualDuration(event.target.value)}
              className="w-[68px] bg-transparent font-mono text-[11px] font-bold outline-none"
              aria-label="Activity duration"
            />
          </label>
          <button
            type="button"
            onClick={addWithoutLocation}
            disabled={!q.trim()}
            className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-[#7C5CBF] px-3 text-[10.5px] font-black text-white transition hover:bg-[#6849A5] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="size-3.5" />
            Add
          </button>
        </div>
      )}

      {err && (
        <p className="mt-2 text-xs font-medium text-destructive">{err}</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-[13px] border border-[#E5DCCB] bg-[#FFFCF6] p-1.5">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              onClick={() => pick(r)}
              className="block w-full rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[#EEE7DA]"
            >
              <span className="block truncate text-[13px] font-black">
                {r.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {r.address}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
