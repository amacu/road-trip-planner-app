"use client";

import { Check, PackageCheck, Plus, Trash2, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import {
  PACKING_ACQUISITIONS,
  PACKING_CATEGORIES,
  type TripPackingItemInput,
  type TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";

type PackingDashboardProps = {
  items: TripPackingItemPlain[];
  onCreate: (input: TripPackingItemInput) => Promise<boolean>;
  onUpdate: (
    itemId: string,
    input: TripPackingItemUpdateInput,
  ) => Promise<boolean>;
  onDelete: (itemId: string) => Promise<boolean>;
};

const ACQUISITION_META: Record<
  (typeof PACKING_ACQUISITIONS)[number],
  { label: string; bg: string; ink: string }
> = {
  have: { label: "Have", bg: "#E1EFE7", ink: "#276848" },
  buy: { label: "Buy", bg: "#FBE7DD", ink: "#B8431F" },
  borrow: { label: "Borrow", bg: "#E8F0F6", ink: "#3F6A8C" },
  rent: { label: "Rent", bg: "#F0E7F5", ink: "#725184" },
  decide: { label: "Decide", bg: "#EEE9DE", ink: "#6A6353" },
};

const EMPTY_DRAFT: TripPackingItemInput = {
  name: "",
  category: PACKING_CATEGORIES[0],
  acquisition: "have",
  quantity: 1,
  notes: "",
  isPacked: false,
};

export function PackingDashboard({
  items,
  onCreate,
  onUpdate,
  onDelete,
}: PackingDashboardProps) {
  const [draft, setDraft] = useState<TripPackingItemInput>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([...PACKING_CATEGORIES, ...items.map((item) => item.category)]),
      ),
    [items],
  );

  const packedCount = items.filter((item) => item.isPacked).length;
  const buyCount = items.filter(
    (item) => item.acquisition === "buy" && !item.isPacked,
  ).length;
  const borrowCount = items.filter(
    (item) => item.acquisition === "borrow" && !item.isPacked,
  ).length;
  const progress = items.length
    ? Math.round((packedCount / items.length) * 100)
    : 0;

  function submitDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;

    void onCreate(draft);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  function cancelForm() {
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  async function removeItem(item: TripPackingItemPlain) {
    if (!confirm(`Remove "${item.name}" from the packing list?`)) return;
    const success = await onDelete(item.id);
    if (success) toast.success("Item removed.");
  }

  return (
    <section className="mt-[18px] rounded-[28px] border border-[#E7DFCE] bg-[#FBF8F1] p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <PackageCheck className="size-6 text-[#E4562A]" />
            <h2 className="m-0 font-['Bricolage_Grotesque'] text-[27px] font-extrabold tracking-[-0.03em]">
              Packing list
            </h2>
          </div>
          <p className="m-0 text-[13px] font-medium text-[#8a8270]">
            Everything to bring, buy, borrow, or rent before departure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (adding ? cancelForm() : setAdding(true))}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#16130D] px-5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-px"
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Cancel" : "Add item"}
        </button>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Packed"
          value={`${packedCount}/${items.length}`}
          tone="green"
        />
        <SummaryTile label="Progress" value={`${progress}%`} tone="neutral" />
        <SummaryTile label="To buy" value={String(buyCount)} tone="peach" />
        <SummaryTile
          label="To borrow"
          value={String(borrowCount)}
          tone="blue"
        />
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E8E0CF]">
        <div
          className="h-full rounded-full bg-[#2E7A57] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {items.length > 0 || adding ? (
        <>
          <div className="mt-5 hidden md:block">
            {adding && (
              <NewPackingRow
                draft={draft}
                categories={categories}
                onChange={setDraft}
                onSubmit={submitDraft}
                onCancel={cancelForm}
              />
            )}
            {items.map((item) => (
              <PackingRow
                key={item.id}
                item={item}
                categories={categories}
                onToggle={() => onUpdate(item.id, { isPacked: !item.isPacked })}
                onUpdate={(input) => onUpdate(item.id, input)}
                onDelete={() => removeItem(item)}
              />
            ))}
          </div>
          <div className="mt-5 space-y-2 md:hidden">
            {adding && (
              <NewPackingCard
                draft={draft}
                categories={categories}
                onChange={setDraft}
                onSubmit={submitDraft}
                onCancel={cancelForm}
              />
            )}
            {items.map((item) => (
              <PackingCard
                key={item.id}
                item={item}
                categories={categories}
                onToggle={() => onUpdate(item.id, { isPacked: !item.isPacked })}
                onUpdate={(input) => onUpdate(item.id, input)}
                onDelete={() => removeItem(item)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#D8CEB8] px-5 py-10 text-center">
          <PackageCheck className="mx-auto size-8 text-[#C8BDA5]" />
          <div className="mt-3 text-sm font-bold">Your list is empty</div>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-[#8a8270]">
            Add the first thing you want to bring, buy, borrow, or rent.
          </p>
        </div>
      )}
    </section>
  );
}

type NewPackingItemProps = {
  draft: TripPackingItemInput;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<TripPackingItemInput>>;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

function NewPackingRow({
  draft,
  categories,
  onChange,
  onSubmit,
  onCancel,
}: NewPackingItemProps) {
  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="grid grid-cols-[48px_minmax(180px,1fr)_58px_minmax(120px,0.65fr)_140px_100px_40px] items-center border-b border-[#E9E0CF] bg-[#FFF4E8] px-1 py-2 text-sm"
    >
      <span className="grid size-6 place-items-center rounded-[6px] border border-dashed border-[#D8CEB8] text-[#B3A994]">
        <Plus className="size-3" />
      </span>
      <input
        autoFocus
        value={draft.name}
        maxLength={120}
        onChange={(event) =>
          onChange((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="New item…"
        aria-label="New item name"
        className={`${inlineDraftClass} pr-3 text-[15px] font-bold`}
      />
      <input
        type="number"
        min={1}
        max={999}
        value={draft.quantity}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            quantity: Number(event.target.value),
          }))
        }
        aria-label="New item quantity"
        className={`${inlineDraftClass} font-['JetBrains_Mono']`}
      />
      <input
        value={draft.notes ?? ""}
        maxLength={500}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            notes: event.target.value,
          }))
        }
        placeholder="Add note"
        aria-label="New item note"
        className={`${inlineDraftClass} truncate text-[11px]`}
      />
      <select
        value={draft.category}
        onChange={(event) =>
          onChange((current) => ({ ...current, category: event.target.value }))
        }
        aria-label="New item category"
        className={`${inlineDraftClass} rounded-full bg-[#FBE7DD] px-3 text-center text-[#B8431F]`}
      >
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <select
        value={draft.acquisition}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            acquisition: event.target
              .value as TripPackingItemInput["acquisition"],
          }))
        }
        aria-label="New item source"
        className={`${inlineDraftClass} font-bold`}
      >
        {PACKING_ACQUISITIONS.map((value) => (
          <option key={value} value={value}>
            {ACQUISITION_META[value].label}
          </option>
        ))}
      </select>
      <DraftActions disabled={!draft.name.trim()} onCancel={onCancel} />
    </form>
  );
}

function NewPackingCard({
  draft,
  categories,
  onChange,
  onSubmit,
  onCancel,
}: NewPackingItemProps) {
  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="rounded-2xl border border-[#E7DFCE] bg-[#FFF4E8] p-3.5"
    >
      <input
        autoFocus
        value={draft.name}
        onChange={(event) =>
          onChange((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="New item…"
        aria-label="New item name"
        className={`${inputClass} font-bold`}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={draft.category}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              category: event.target.value,
            }))
          }
          aria-label="New item category"
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select
          value={draft.acquisition}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              acquisition: event.target
                .value as TripPackingItemInput["acquisition"],
            }))
          }
          aria-label="New item source"
          className={inputClass}
        >
          {PACKING_ACQUISITIONS.map((value) => (
            <option key={value} value={value}>
              {ACQUISITION_META[value].label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={999}
          value={draft.quantity}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              quantity: Number(event.target.value),
            }))
          }
          aria-label="New item quantity"
          className={inputClass}
        />
      </div>
      <input
        value={draft.notes ?? ""}
        onChange={(event) =>
          onChange((current) => ({ ...current, notes: event.target.value }))
        }
        placeholder="Add note"
        aria-label="New item note"
        className={`${inputClass} mt-2`}
      />
      <div className="mt-2 flex justify-end">
        <DraftActions disabled={!draft.name.trim()} onCancel={onCancel} />
      </div>
    </form>
  );
}

function DraftActions({
  disabled,
  onCancel,
}: {
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <span className="flex justify-end gap-1">
      <button
        type="submit"
        disabled={disabled}
        aria-label="Add item"
        className="grid size-8 place-items-center rounded-lg bg-[#2E7A57] text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel adding item"
        className="grid size-8 place-items-center rounded-lg text-[#8a8270] hover:bg-[#F0EADB]"
      >
        <X className="size-4" />
      </button>
    </span>
  );
}

function PackingRow({
  item,
  categories,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  onToggle: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  return (
    <div className="group grid grid-cols-[48px_minmax(180px,1fr)_58px_minmax(120px,0.65fr)_140px_100px_40px] items-center border-b border-[#E9E0CF] px-1 py-2 text-sm">
      <PackCheckbox checked={item.isPacked} onClick={onToggle} />
      <InlineText
        value={item.name}
        ariaLabel="Item name"
        className={`pr-3 text-[15px] font-bold ${item.isPacked ? "line-through text-[#A49B87]" : "text-[#16130D]"}`}
        onCommit={(name) => name.trim() && void onUpdate({ name })}
      />
      <InlineNumber
        value={item.quantity}
        onCommit={(quantity) => void onUpdate({ quantity })}
      />
      <InlineText
        value={item.notes ?? ""}
        ariaLabel="Note"
        placeholder="Add note"
        className="truncate text-[11px] text-[#A49B87]"
        onCommit={(notes) => void onUpdate({ notes })}
      />
      <InlineSelect
        value={item.category}
        ariaLabel="Category"
        options={categories.map((value) => ({ value, label: value }))}
        onChange={(category) => void onUpdate({ category })}
        className="rounded-full px-3 text-center font-bold"
        style={categoryTone(item.category)}
      />
      <InlineSelect
        value={item.acquisition}
        ariaLabel="Source"
        options={PACKING_ACQUISITIONS.map((value) => ({
          value,
          label: ACQUISITION_META[value].label,
        }))}
        onChange={(acquisition) =>
          void onUpdate({
            acquisition:
              acquisition as TripPackingItemUpdateInput["acquisition"],
          })
        }
        className="font-bold"
        style={{ color: acquisitionTone(item.acquisition) }}
      />
      <RowActions onDelete={onDelete} />
    </div>
  );
}

function PackingCard({
  item,
  categories,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  onToggle: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group rounded-2xl border border-[#E7DFCE] p-3.5 ${
        item.isPacked ? "bg-[#F4F7F2]" : "bg-[#fffaf0]"
      }`}
    >
      <div className="flex items-start gap-3">
        <PackCheckbox checked={item.isPacked} onClick={onToggle} />
        <div className="min-w-0 flex-1">
          <InlineText
            value={item.name}
            ariaLabel="Item name"
            className={`font-bold ${item.isPacked ? "line-through text-[#8a8270]" : ""}`}
            onCommit={(name) => name.trim() && void onUpdate({ name })}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <InlineSelect
              value={item.category}
              ariaLabel="Category"
              options={categories.map((value) => ({ value, label: value }))}
              onChange={(category) => void onUpdate({ category })}
              className="rounded-full px-3 text-center font-bold"
              style={categoryTone(item.category)}
            />
            <InlineSelect
              value={item.acquisition}
              ariaLabel="Source"
              options={PACKING_ACQUISITIONS.map((value) => ({
                value,
                label: ACQUISITION_META[value].label,
              }))}
              onChange={(acquisition) =>
                void onUpdate({
                  acquisition:
                    acquisition as TripPackingItemUpdateInput["acquisition"],
                })
              }
              className="font-bold"
              style={{ color: acquisitionTone(item.acquisition) }}
            />
            <InlineNumber
              value={item.quantity}
              onCommit={(quantity) => void onUpdate({ quantity })}
            />
          </div>
          <InlineText
            value={item.notes ?? ""}
            ariaLabel="Note"
            placeholder="Add note"
            className="mt-2 text-xs text-[#7a7264]"
            onCommit={(notes) => void onUpdate({ notes })}
          />
        </div>
        <RowActions onDelete={onDelete} />
      </div>
    </div>
  );
}

function PackCheckbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={checked ? "Mark as unpacked" : "Mark as packed"}
      className={`grid size-6 shrink-0 place-items-center rounded-[6px] border transition-colors ${
        checked
          ? "border-[#2E7A57] bg-[#2E7A57] text-white"
          : "border-[#D8CEB8] bg-white text-transparent hover:border-[#2E7A57]"
      }`}
    >
      <Check className="size-3.5" />
    </button>
  );
}

function RowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete item"
        className="grid size-8 place-items-center rounded-lg text-[#B3A994] opacity-0 transition-opacity hover:bg-[#FBE7DD] hover:text-[#B8431F] group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function InlineText({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  className = "",
}: {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => setLocalValue(value), [value]);

  function commit() {
    if (localValue !== value) onCommit(localValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setLocalValue(value);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 outline-none placeholder:text-[#B3A994] hover:border-[#E7DFCE] hover:bg-white focus:border-[#E4562A] focus:bg-white ${className}`}
    />
  );
}

function InlineNumber({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));
  useEffect(() => setLocalValue(String(value)), [value]);

  function commit() {
    const next = Math.max(1, Math.min(999, Number(localValue) || 1));
    setLocalValue(String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <input
      type="number"
      min={1}
      max={999}
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      aria-label="Quantity"
      className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-['JetBrains_Mono'] text-xs font-bold outline-none hover:border-[#E7DFCE] hover:bg-white focus:border-[#E4562A] focus:bg-white"
    />
  );
}

function InlineSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  style,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      style={style}
      className={`min-w-0 rounded-md border border-transparent bg-transparent px-1 py-1 text-xs font-semibold text-[#7a7264] outline-none hover:border-[#E7DFCE] focus:border-[#E4562A] ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "neutral" | "peach" | "blue";
}) {
  const colors = {
    green: "bg-[#E1EFE7] text-[#276848]",
    neutral: "bg-[#F0EADB] text-[#6A6353]",
    peach: "bg-[#FBE7DD] text-[#B8431F]",
    blue: "bg-[#E8F0F6] text-[#3F6A8C]",
  };
  return (
    <div className={`rounded-[20px] px-5 py-5 ${colors[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-[.07em] opacity-85">
        {label}
      </div>
      <div className="mt-2 font-['JetBrains_Mono'] text-[30px] font-bold leading-none tracking-[-0.04em] text-[#16130D]">
        {value}
      </div>
    </div>
  );
}

function categoryTone(category: string): React.CSSProperties {
  const tones = [
    { background: "#FBE7DD", color: "#B8431F" },
    { background: "#E8F0F6", color: "#3F6A8C" },
    { background: "#E1EFE7", color: "#276848" },
    { background: "#F0E7F5", color: "#725184" },
  ];
  const hash = [...category].reduce(
    (sum, letter) => sum + letter.charCodeAt(0),
    0,
  );
  return tones[hash % tones.length];
}

function acquisitionTone(acquisition: string) {
  return (
    ACQUISITION_META[acquisition as keyof typeof ACQUISITION_META]?.ink ??
    "#6A6353"
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-[#D8CEB8] bg-white px-3 text-sm font-medium text-[#16130D] outline-none transition-colors placeholder:text-[#B3A994] focus:border-[#E4562A] focus:ring-2 focus:ring-[#E4562A]/10";

const inlineDraftClass =
  "min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs font-semibold text-[#5f5748] outline-none placeholder:text-[#B3A994] hover:border-[#E7DFCE] hover:bg-white focus:border-[#E4562A] focus:bg-white";
