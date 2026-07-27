"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildTripExportPrompt } from "@/features/trips/lib/trip-export";
import type { TripPlain } from "@/features/trips/lib/trip-view-model";

/**
 * navigator.clipboard requires a secure context (HTTPS or localhost) — it's
 * undefined on plain-HTTP LAN addresses (e.g. testing on a phone via
 * `next dev --hostname 0.0.0.0`), so this falls back to the legacy
 * execCommand approach via a temporary off-screen textarea.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy approach below
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ExportTripCard({
  trip,
  totalKm,
  totalMin,
  fuelPln,
}: {
  trip: TripPlain;
  totalKm: number;
  totalMin: number;
  fuelPln: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 rounded-[22px] border border-[#E7DFCE] bg-[#FBF8F1] p-5 text-left shadow-sm transition-colors hover:border-brand/40 hover:bg-[#fffaf0]"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-brand to-[#f0834f] text-white shadow-[0_10px_24px_rgba(228,86,42,0.26)]">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-['Bricolage_Grotesque'] text-[16px] font-bold tracking-[-0.02em]">
            Export for AI
          </h2>
          <p className="mt-0.5 text-[12.5px] font-medium text-[#948b76]">
            Turn this trip into a prompt you can paste into ChatGPT, Claude, or
            any AI to keep planning.
          </p>
        </div>
      </button>

      <ExportTripDialog
        trip={trip}
        totalKm={totalKm}
        totalMin={totalMin}
        fuelPln={fuelPln}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function ExportTripDialog({
  trip,
  totalKm,
  totalMin,
  fuelPln,
  open,
  onOpenChange,
}: {
  trip: TripPlain;
  totalKm: number;
  totalMin: number;
  fuelPln: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  // Only recomputed while the dialog can be open — no need to regenerate
  // this on every Overview re-render for a feature the user may never open.
  const prompt = useMemo(
    () => buildTripExportPrompt(trip, { totalKm, totalMin, fuelPln }),
    [trip, totalKm, totalMin, fuelPln],
  );

  async function copyPrompt() {
    const success = await copyToClipboard(prompt);
    if (!success) {
      toast.error(
        "Couldn't copy automatically — select the text and copy it manually.",
      );
      return;
    }

    setCopied(true);
    toast.success("Prompt copied to clipboard.");
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto bg-[#F3EDE1] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            Export for AI
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Copy this and paste it into your favorite AI chat to brainstorm, fill
          gaps, or double-check your itinerary.
        </p>

        <div className="relative">
          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.currentTarget.select()}
            rows={14}
            className="w-full resize-none rounded-xl border border-[#E7DFCE] bg-white px-4 py-3 font-mono text-xs leading-relaxed text-[#16130D] outline-none ring-brand/40 focus:ring-2"
          />
        </div>

        <button
          type="button"
          onClick={copyPrompt}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-bold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied to clipboard
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy prompt
            </>
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
