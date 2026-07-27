"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { geocode } from "@/lib/geocode-client";
import type { GeocodeResult } from "@/lib/integrations/geocode";

export function AddStopBox({
  onAdd,
  onClose,
  placeholder = "Search a place or paste a Google Maps link",
  helpText = "Or click anywhere on the map to drop a pin.",
}: {
  onAdd: (result: GeocodeResult) => void;
  onClose?: () => void;
  placeholder?: string;
  helpText?: string;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="mb-3 rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) pick(results[0]);
            }}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-input bg-white px-9 text-sm outline-none ring-brand/40 focus:ring-2"
          />
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {helpText && (
        <p className="mt-2 text-xs text-muted-foreground">{helpText}</p>
      )}

      {err && (
        <p className="mt-2 text-xs font-medium text-destructive">{err}</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              onClick={() => pick(r)}
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
            >
              <span className="block truncate text-sm font-bold">{r.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.address}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
