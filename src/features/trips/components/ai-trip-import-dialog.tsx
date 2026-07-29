"use client";

import {
  Check,
  Copy,
  Loader2,
  MessageCircleMore,
  Route,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildTripExportPrompt } from "@/features/trips/lib/trip-export";
import type { TripPlain } from "@/features/trips/lib/trip-view-model";

export type AiTripPlace = {
  name: string;
  type: "stop" | "activity" | "overnight";
  travelMode: "driving" | "walking";
  stayType?: "hotel" | "tent" | "car" | "driving_overnight";
  visitDurationMin: number | null;
  notesMarkdown: string;
  address: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
};

export type AiTripDay = {
  name: string | null;
  dayStartTime: string;
  dayNotesMarkdown: string;
  items: AiTripPlace[];
};

export function AiTripImportDialog({
  trip,
  totalKm,
  totalMin,
  fuelPln,
  open,
  onOpenChange,
  onImport,
}: {
  trip: TripPlain;
  totalKm: number;
  totalMin: number;
  fuelPln: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (days: AiTripDay[], replaceExisting: boolean) => Promise<boolean>;
}) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [keepExisting, setKeepExisting] = useState(false);
  const [planningMode, setPlanningMode] = useState<"ready" | "collaborate">(
    "ready",
  );

  const prompt = useMemo(() => {
    const currentPlan = buildTripExportPrompt(trip, {
      totalKm,
      totalMin,
      fuelPln,
    });
    const planningRule = keepExisting
      ? "Zachowaj istniejący plan. Finalny JSON ma zawierać wyłącznie NOWE dni, które warto dopisać po obecnych dniach."
      : "Zaplanuj całą wyprawę od początku. Finalny JSON zastąpi wszystkie obecne dni.";
    const conversationRule =
      planningMode === "ready"
        ? `Od razu przygotuj kompletny plan. Zwróć WYŁĄCZNIE poprawny JSON, bez Markdownu poza wartościami pól i bez dodatkowego komentarza, zgodny z formatem poniżej.`
        : `NIE twórz jeszcze JSON-u ani finalnego planu. Najpierw pomóż mi zaplanować wyprawę w normalnej rozmowie: ustal moje preferencje, tempo, budżet, zainteresowania i ograniczenia, zadawaj konkretne pytania oraz proponuj warianty. Odpowiadaj zwykłym tekstem.

Dopiero gdy wyraźnie poproszę o gotowy JSON (np. napiszę „wygeneruj JSON”), zwróć WYŁĄCZNIE JSON zgodny z formatem i zasadami poniżej, bez dodatkowego komentarza.`;

    return `Jesteś doświadczonym planerem road tripów. Pomóż mi przygotować atrakcyjny, realistyczny i logiczny plan CAŁEJ wyprawy.

Obecny kontekst wyprawy:
${currentPlan}

${planningRule}

${conversationRule}

Format finalnego JSON-u:
{
  "days": [
    {
      "name": "Krótka nazwa dnia",
      "dayStartTime": "08:30",
      "dayNotesMarkdown": "## Plan dnia\\nOpis charakteru dnia i wskazówki.",
      "items": [
        {
          "name": "Nazwa miejsca",
          "type": "stop",
          "travelMode": "driving",
          "stayType": "hotel",
          "visitDurationMin": 90,
          "notesMarkdown": "### Dlaczego warto\\n- Co zobaczyć\\n- Praktyczna wskazówka",
          "address": "Miejscowość lub pełny adres i kraj",
          "latitude": 52.2297,
          "longitude": 21.0122,
          "countryCode": "PL"
        }
      ]
    }
  ]
}

Zasady:
- zwróć od 1 do 30 dni w logicznej kolejności;
- każdy dzień musi mieć dayStartTime w formacie HH:mm, dayNotesMarkdown i od 1 do 20 elementów;
- type ustaw jako "stop" dla głównego punktu trasy, "activity" dla atrakcji, restauracji i krótszych punktów albo "overnight" dla noclegu;
- ostatnim elementem każdego dnia może być jeden "overnight"; ustaw dla niego stayType: "hotel", "tent", "car" albo "driving_overnight" oraz visitDurationMin: null;
- dla każdego stop i activity podaj visitDurationMin jako liczbę całkowitą 15–720;
- travelMode określa dotarcie z poprzedniego punktu: "walking" albo "driving";
- notesMarkdown każdego miejsca ma zawierać konkretny opis i praktyczne wskazówki; nie wymyślaj linków;
- używaj rzeczywistych miejsc i możliwie dokładnych współrzędnych;
- latitude i longitude muszą być liczbami, a countryCode dwuliterowym kodem ISO.`;
  }, [fuelPln, keepExisting, planningMode, totalKm, totalMin, trip]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the prompt. Select and copy it manually.");
    }
  }

  async function importResponse() {
    setError(null);
    let days: AiTripDay[];
    try {
      days = parseAiTripPlan(response);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "The AI response is not valid.",
      );
      return;
    }

    setImporting(true);
    const success = await onImport(days, !keepExisting);
    setImporting(false);
    if (!success) {
      setError(
        "The trip plan could not be fully saved. Check it and try again.",
      );
      return;
    }
    setResponse("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E7DFCE] bg-[#FBF8F1] sm:max-w-[680px] sm:rounded-[22px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-['Bricolage_Grotesque'] text-2xl font-extrabold">
            <Sparkles className="size-5 text-[#E4562A]" />
            Import whole trip from AI
          </DialogTitle>
          <DialogDescription>
            Copy the prompt to your AI assistant, then paste its JSON response
            below.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            How should AI help?
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-[15px] border border-[#E7DFCE] bg-[#EEE8DC] p-1.5 shadow-inner">
            {(
              [
                ["ready", "Ready plan", Route],
                ["collaborate", "Plan together", MessageCircleMore],
              ] as const
            ).map(([value, label, Icon]) => {
              const active = planningMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlanningMode(value)}
                  className={`group flex min-h-12 items-center justify-center gap-2 rounded-[11px] border px-3 text-sm font-bold transition-all ${
                    active
                      ? "border-[#E7DFCE] bg-[#FFFDF8] text-[#16130D] shadow-[0_3px_10px_rgba(50,42,25,0.10)]"
                      : "border-transparent text-[#7A7264] hover:bg-white/45 hover:text-[#433D32]"
                  }`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-[9px] transition-colors ${
                      active
                        ? "bg-[#FBE7DD] text-[#D95128]"
                        : "bg-[#E5DED0] text-[#8A8270] group-hover:bg-[#F3EFE4]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          <p className="px-1 pt-2.5 text-xs leading-relaxed text-[#7A7264]">
            {planningMode === "ready"
              ? "AI will immediately return a complete JSON plan ready to import."
              : "AI will discuss the trip with you first and return JSON only when you ask for it."}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-[13px] border border-[#E7DFCE] bg-[#F3EFE4] p-3">
          <input
            type="checkbox"
            checked={keepExisting}
            onChange={(event) => setKeepExisting(event.target.checked)}
            className="mt-0.5 size-4 accent-[#E4562A]"
          />
          <span>
            <span className="block text-sm font-bold text-[#16130D]">
              Keep the current trip plan
            </span>
            <span className="mt-0.5 block text-xs text-[#7A7264]">
              {keepExisting
                ? "AI will suggest new days to append after the current route."
                : "AI will plan the whole trip and replace the current days."}
            </span>
          </span>
        </label>

        <div className="flex items-center justify-between gap-4 rounded-[13px] border border-[#E7DFCE] bg-white p-3.5">
          <div>
            <div className="text-sm font-bold text-[#16130D]">
              AI planning prompt
            </div>
            <p className="mt-0.5 text-xs text-[#7A7264]">
              {planningMode === "ready"
                ? "It asks for a complete, import-ready JSON plan."
                : "It starts a planning conversation and includes the final JSON format for later."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#16130D] px-3.5 text-xs font-bold text-white hover:bg-[#2A251B]"
          >
            {copied ? (
              <Check className="size-4 text-[#8FD3AE]" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            Paste the AI response
          </div>
          <textarea
            value={response}
            onChange={(event) => {
              setResponse(event.target.value);
              setError(null);
            }}
            placeholder='{"days":[{"name":"…","dayStartTime":"08:30","dayNotesMarkdown":"…","items":[…]}]}'
            className="h-48 w-full resize-none rounded-[13px] border border-[#D8CEB8] bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-[#E4562A]/20"
          />
          {error && (
            <p className="mt-2 text-xs font-semibold text-[#B8431F]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-[11px] px-4 text-sm font-bold text-[#6A6353] hover:bg-[#F0EADB]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importResponse()}
            disabled={!response.trim() || importing}
            className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#16130D] px-4 text-sm font-bold text-white hover:bg-[#2A251B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {importing ? "Importing…" : "Import trip"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseAiTripPlan(raw: string): AiTripDay[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!cleaned) throw new Error("Paste the response generated by AI.");

  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch {
    throw new Error("This is not valid JSON. Ask the AI to return JSON only.");
  }

  const root = value as Record<string, unknown>;
  const rawDays = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray(root.days)
      ? root.days
      : null;
  if (!rawDays?.length) {
    throw new Error('The response must contain a non-empty "days" array.');
  }
  if (rawDays.length > 30) throw new Error("Import at most 30 days at once.");

  return rawDays.map((rawDay, dayIndex) => {
    if (!rawDay || typeof rawDay !== "object") {
      throw new Error(`Day ${dayIndex + 1} has an invalid format.`);
    }
    const day = rawDay as Record<string, unknown>;
    const dayStartTime =
      typeof day.dayStartTime === "string" ? day.dayStartTime.trim() : "";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dayStartTime)) {
      throw new Error(
        `Day ${dayIndex + 1} needs dayStartTime in HH:mm format.`,
      );
    }
    if (!Array.isArray(day.items) || day.items.length === 0) {
      throw new Error(`Day ${dayIndex + 1} needs a non-empty items array.`);
    }
    if (day.items.length > 20) {
      throw new Error(`Day ${dayIndex + 1} contains more than 20 places.`);
    }

    const parsedItems = day.items.map((rawItem, itemIndex) =>
      parsePlace(rawItem, dayIndex, itemIndex),
    );
    if (!parsedItems.some((item) => item.type !== "overnight")) {
      throw new Error(
        `Day ${dayIndex + 1} needs at least one stop or activity.`,
      );
    }

    return {
      name:
        typeof day.name === "string"
          ? day.name.trim().slice(0, 120) || null
          : null,
      dayStartTime,
      dayNotesMarkdown:
        typeof day.dayNotesMarkdown === "string"
          ? day.dayNotesMarkdown.trim().slice(0, 6000)
          : "",
      items: parsedItems,
    };
  });
}

function parsePlace(
  rawItem: unknown,
  dayIndex: number,
  itemIndex: number,
): AiTripPlace {
  const label = `Place ${itemIndex + 1} in day ${dayIndex + 1}`;
  if (!rawItem || typeof rawItem !== "object") {
    throw new Error(`${label} has an invalid format.`);
  }
  const item = rawItem as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const latitude = Number(item.latitude ?? item.lat);
  const longitude = Number(item.longitude ?? item.lng);
  const type =
    item.type === "activity"
      ? "activity"
      : item.type === "overnight"
        ? "overnight"
        : "stop";
  const visitDurationMin =
    type === "overnight" ? null : Number(item.visitDurationMin);
  const rawCountryCode =
    typeof item.countryCode === "string"
      ? item.countryCode.trim().toUpperCase()
      : null;

  if (!name) throw new Error(`${label} is missing a name.`);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`${label} has an invalid latitude.`);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`${label} has an invalid longitude.`);
  }
  if (rawCountryCode && !/^[A-Z]{2}$/.test(rawCountryCode)) {
    throw new Error(`${label} has an invalid country code.`);
  }
  if (
    type !== "overnight" &&
    (!Number.isInteger(visitDurationMin) ||
      visitDurationMin == null ||
      visitDurationMin < 15 ||
      visitDurationMin > 720)
  ) {
    throw new Error(`${label} has an invalid visitDurationMin.`);
  }

  return {
    name: name.slice(0, 120),
    type,
    travelMode: item.travelMode === "walking" ? "walking" : "driving",
    stayType:
      type !== "overnight"
        ? undefined
        : item.stayType === "tent" ||
            item.stayType === "car" ||
            item.stayType === "driving_overnight"
          ? item.stayType
          : "hotel",
    visitDurationMin,
    notesMarkdown:
      typeof item.notesMarkdown === "string"
        ? item.notesMarkdown.trim().slice(0, 6000)
        : "",
    address:
      typeof item.address === "string" && item.address.trim()
        ? item.address.trim().slice(0, 300)
        : name.slice(0, 300),
    latitude,
    longitude,
    countryCode: rawCountryCode,
  };
}
