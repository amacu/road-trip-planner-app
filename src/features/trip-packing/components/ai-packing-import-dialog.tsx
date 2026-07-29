"use client";

import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import {
  type PackingCategory,
  type TripPackingItemInput,
} from "@/lib/validators/trip-packing-item";

type ParsedPackingPlan = {
  items: TripPackingItemInput[];
  categories: Array<{ name: string; color: string }>;
};

type PackingScope = "essential" | "standard" | "complete";

export function AiPackingImportDialog({
  open,
  onOpenChange,
  tripContext,
  items,
  categories,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripContext: string;
  items: TripPackingItemPlain[];
  categories: PackingCategory[];
  onImport: (
    plan: ParsedPackingPlan,
    replaceExisting: boolean,
    allowNewCategories: boolean,
  ) => Promise<boolean>;
}) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [allowNewCategories, setAllowNewCategories] = useState(false);
  const [packingScope, setPackingScope] = useState<PackingScope>("standard");
  const [travelerCount, setTravelerCount] = useState(2);

  const prompt = useMemo(() => {
    const categoryNames = categories.map((category) => category.name);
    const packingItems = items.filter((item) => item.acquisition !== "buy");
    const shoppingItems = items.filter((item) => item.acquisition === "buy");
    const currentPackingList =
      packingItems.length === 0
        ? "- Brak"
        : packingItems
            .map(
              (item) =>
                `- ${item.name} ×${item.quantity} | ${item.category}${item.notes ? ` | ${item.notes}` : ""}`,
            )
            .join("\n");
    const currentShoppingList =
      shoppingItems.length === 0
        ? "- Brak"
        : shoppingItems
            .map(
              (item) =>
                `- ${item.name} ×${item.quantity} | ${item.category}${item.notes ? ` | ${item.notes}` : ""}`,
            )
            .join("\n");
    const importRule = replaceExisting
      ? "Przygotuj kompletną listę od zera. Import NADPISZE obecną listę."
      : "Zachowaj obecną listę. Zwróć WYŁĄCZNIE nowe, brakujące rzeczy, które należy do niej dopisać; nie duplikuj istniejących pozycji.";
    const categoryRule = allowNewCategories
      ? `Możesz zaproponować nowe kategorie. Każdą nową kategorię umieść w tablicy "categories" z nazwą i kolorem HEX. Istniejących kategorii nie umieszczaj w tej tablicy.`
      : `Nie twórz nowych kategorii. Tablica "categories" musi być pusta, a każde item.category musi być dokładnie jedną z tych nazw: ${categoryNames.join(", ")}.`;
    const scopeRule = {
      essential:
        "Zakres KLUCZOWY: dodaj tylko rzeczy niezbędne dla bezpieczeństwa, dokumentów, podstawowej higieny, noclegów i zaplanowanych aktywności. Pomiń wygodne dodatki oraz rzeczy opcjonalne.",
      standard:
        "Zakres STANDARDOWY: dodaj wszystkie rzeczy kluczowe oraz rozsądne wyposażenie, które realnie warto zabrać dla wygody i zaplanowanych aktywności. Pomiń dodatki o marginalnej przydatności.",
      complete:
        "Zakres PEŁNY: przygotuj kompletną i szczegółową listę obejmującą rzeczy niezbędne, wygodne dodatki, warianty pogodowe, zapasowe elementy oraz wyposażenie awaryjne odpowiednie dla tej wyprawy.",
    }[packingScope];

    return `Jesteś doświadczonym planerem wypraw i specjalistą od pakowania. Przygotuj praktyczną listę pakowania dopasowaną do całej poniższej podróży: kierunków, długości, planowanych aktywności, sposobów noclegu, pogody typowej dla miejsc i terminu, przejazdów oraz pojazdu. Nie dodawaj przypadkowych rzeczy i nie twórz duplikatów.

KONTEKST CAŁEJ WYCIECZKI:
${tripContext}

OBECNA LISTA DO SPAKOWANIA:
${currentPackingList}

OBECNA LISTA RZECZY DO KUPIENIA:
${currentShoppingList}
Traktuj rzeczy z listy zakupów jako już zaplanowane wyposażenie wyprawy. Nie dodawaj ich ponownie do zwracanego JSON-u ani pod identyczną, ani równoważną nazwą.

ISTNIEJĄCE KATEGORIE:
${categoryNames.join(", ")}

${importRule}
${categoryRule}
${scopeRule}

LICZBA PODRÓŻUJĄCYCH: ${travelerCount}
Dobierz quantity świadomie do ${travelerCount} ${travelerCount === 1 ? "osoby" : "osób"}. Rzeczy osobiste licz na osobę. Rzeczy wspólne, takie jak apteczka, narzędzia, namiot czy sprzęt kuchenny, licz na grupę i nie mnoż ich bez potrzeby. Jeśli rzecz oznacza zestaw na cały wyjazd, wyjaśnij to krótko w notes.

Zwróć WYŁĄCZNIE poprawny JSON, bez Markdownu i bez komentarza:
{
  "categories": [
    { "name": "Nowa kategoria", "color": "#4D7D65" }
  ],
  "items": [
    {
      "name": "Nazwa rzeczy",
      "category": "Dokładna nazwa kategorii",
      "quantity": 1,
      "notes": null
    }
  ]
}

Zasady:
- zwróć od 1 do 200 sensownych pozycji;
- quantity musi być liczbą całkowitą 1–999;
- notes jest ostatecznością: domyślnie ustawiaj null i dodawaj notatkę tylko wtedy, gdy przy danej rzeczy naprawdę trzeba przekazać istotną informację dotyczącą jej wyboru, ilości, przeznaczenia lub użycia;
- nie dodawaj notes do każdej pozycji, nie powtarzaj w nim nazwy rzeczy ani oczywistych informacji; jeśli pozycja jest zrozumiała bez wyjaśnienia, notes musi być null;
- jeśli notes jest konieczny, ma być konkretny i mieć maksymalnie 500 znaków;
- item.category musi odpowiadać istniejącej lub zwróconej nowej kategorii;
- lista dotyczy wyłącznie rzeczy do spakowania, nie zakupów i budżetu;
- nie dodawaj pól id, acquisition, price, productLinks, isPurchased ani isPacked.`;
  }, [
    allowNewCategories,
    categories,
    items,
    packingScope,
    replaceExisting,
    travelerCount,
    tripContext,
  ]);

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
    let plan: ParsedPackingPlan;
    try {
      plan = parsePackingPlan(response, categories, allowNewCategories);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "The AI response is not valid.",
      );
      return;
    }

    setImporting(true);
    const success = await onImport(plan, replaceExisting, allowNewCategories);
    setImporting(false);
    if (!success) return;
    setResponse("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E7DFCE] bg-[#FBF8F1] sm:max-w-[680px] sm:rounded-[22px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-['Bricolage_Grotesque'] text-2xl font-extrabold">
            <Sparkles className="size-5 text-[#E4562A]" />
            Create packing list with AI
          </DialogTitle>
          <DialogDescription>
            Copy the trip-aware prompt to your AI assistant, then paste its JSON
            response below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <Option
            checked={replaceExisting}
            onChange={setReplaceExisting}
            title="Replace current list"
            description={
              replaceExisting
                ? "AI will create the complete list from scratch."
                : "AI will only add missing items."
            }
          />
          <Option
            checked={allowNewCategories}
            onChange={setAllowNewCategories}
            title="Allow new categories"
            description={
              allowNewCategories
                ? "AI may define additional categories."
                : "AI must use your existing categories."
            }
          />
        </div>

        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8A8270]">
            Packing detail
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-[15px] border border-[#E7DFCE] bg-[#EEE8DC] p-1.5">
            {(
              [
                ["essential", "Essentials", "Only must-haves"],
                ["standard", "Standard", "Must-haves + useful"],
                ["complete", "Complete", "Everything relevant"],
              ] as const
            ).map(([value, label, description]) => {
              const active = packingScope === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPackingScope(value)}
                  className={`min-w-0 rounded-[11px] border px-2 py-2.5 text-center transition-all ${
                    active
                      ? "border-[#E7DFCE] bg-[#FFFDF8] text-[#16130D] shadow-sm"
                      : "border-transparent text-[#7A7264]"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className="mt-0.5 hidden text-[9px] leading-tight text-[#8A8270] sm:block">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-[13px] border border-[#E7DFCE] bg-[#F3EFE4] p-3">
          <span>
            <span className="block text-sm font-bold">Travelers</span>
            <span className="mt-0.5 block text-xs text-[#7A7264]">
              AI will adjust personal and shared quantities.
            </span>
          </span>
          <input
            type="number"
            min={1}
            max={50}
            value={travelerCount}
            onChange={(event) =>
              setTravelerCount(
                Math.max(1, Math.min(50, Number(event.target.value) || 1)),
              )
            }
            aria-label="Number of travelers"
            className="h-10 w-16 rounded-[10px] border border-[#D8CEB8] bg-white px-2 text-center font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-[#E4562A]/20"
          />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-[13px] border border-[#E7DFCE] bg-white p-3.5">
          <div className="min-w-0">
            <div className="text-sm font-bold">AI packing prompt</div>
            <p className="mt-0.5 text-xs text-[#7A7264]">
              Includes the route, nights, activities, duration and current list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#16130D] px-3.5 text-xs font-bold text-white"
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
            placeholder='{"categories":[],"items":[{"name":"Rain jacket","category":"Clothing","quantity":1,"notes":null}]}'
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
            className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#16130D] px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {importing ? "Importing…" : "Import list"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Option({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[13px] border border-[#E7DFCE] bg-[#F3EFE4] p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[#E4562A]"
      />
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs text-[#7A7264]">
          {description}
        </span>
      </span>
    </label>
  );
}

function parsePackingPlan(
  raw: string,
  existingCategories: PackingCategory[],
  allowNewCategories: boolean,
): ParsedPackingPlan {
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The response must be a JSON object.");
  }

  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.items) || root.items.length === 0) {
    throw new Error('The response needs a non-empty "items" array.');
  }
  if (root.items.length > 200) throw new Error("Import at most 200 items.");

  const rawCategories = Array.isArray(root.categories) ? root.categories : [];
  if (!allowNewCategories && rawCategories.length > 0) {
    throw new Error(
      "New categories are disabled. Ask AI to use only existing ones.",
    );
  }
  if (rawCategories.length > 20) {
    throw new Error("AI may add at most 20 categories.");
  }

  const existingByKey = new Map(
    existingCategories.map((category) => [
      category.name.toLocaleLowerCase(),
      category.name,
    ]),
  );
  const categories = rawCategories.map((rawCategory, index) => {
    if (!rawCategory || typeof rawCategory !== "object") {
      throw new Error(`Category ${index + 1} has an invalid format.`);
    }
    const category = rawCategory as Record<string, unknown>;
    const name = text(category.name, 60, `Category ${index + 1} needs a name.`);
    const color =
      typeof category.color === "string" &&
      /^#[0-9A-Fa-f]{6}$/.test(category.color)
        ? category.color.toUpperCase()
        : "#6A6353";
    if (existingByKey.has(name.toLocaleLowerCase())) {
      throw new Error(`Category "${name}" already exists.`);
    }
    existingByKey.set(name.toLocaleLowerCase(), name);
    return { name, color };
  });

  const items = root.items.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object") {
      throw new Error(`Item ${index + 1} has an invalid format.`);
    }
    const item = rawItem as Record<string, unknown>;
    const rawCategory = text(
      item.category,
      60,
      `Item ${index + 1} needs a category.`,
    );
    const category = existingByKey.get(rawCategory.toLocaleLowerCase());
    if (!category) {
      throw new Error(
        `Item ${index + 1} uses unknown category "${rawCategory}".`,
      );
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new Error(`Item ${index + 1} needs quantity from 1 to 999.`);
    }
    return {
      name: text(item.name, 120, `Item ${index + 1} needs a name.`),
      category,
      acquisition: "have" as const,
      quantity,
      notes:
        typeof item.notes === "string" ? item.notes.trim().slice(0, 500) : null,
      price: null,
      productLinks: [],
      isPurchased: false,
      isPacked: false,
    };
  });

  return { categories, items };
}

function text(value: unknown, max: number, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim().slice(0, max);
}
