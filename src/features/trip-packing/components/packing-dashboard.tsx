"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Link2,
  PackageCheck,
  Plus,
  Settings2,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import type { TripPackingItemPlain } from "@/features/trips/lib/trip-view-model";
import {
  PACKING_CATEGORIES,
  type PackingCategory,
  type ProductLink,
  type TripPackingItemInput,
  type TripPackingItemUpdateInput,
} from "@/lib/validators/trip-packing-item";

type PackingDashboardProps = {
  items: TripPackingItemPlain[];
  categories: PackingCategory[];
  onCreate: (input: TripPackingItemInput) => Promise<boolean>;
  onUpdate: (
    itemId: string,
    input: TripPackingItemUpdateInput,
  ) => Promise<boolean>;
  onDelete: (itemId: string) => Promise<boolean>;
  onUpdateCategories: (categories: PackingCategory[]) => Promise<boolean>;
};

const EMPTY_DRAFT: TripPackingItemInput = {
  name: "",
  category: PACKING_CATEGORIES[0],
  acquisition: "have",
  quantity: 1,
  notes: "",
  price: null,
  productLinks: [],
  isPurchased: false,
  isPacked: false,
};

const SHOPPING_TABLE_GRID =
  "grid-cols-[40px_minmax(160px,1.25fr)_140px_56px_minmax(120px,.75fr)_108px_76px]";
const PACKING_TABLE_GRID =
  "grid-cols-[40px_minmax(180px,1.3fr)_140px_56px_minmax(140px,.8fr)_76px]";

export function PackingDashboard({
  items,
  categories: categoryConfigs,
  onCreate,
  onUpdate,
  onDelete,
  onUpdateCategories,
}: PackingDashboardProps) {
  const [draft, setDraft] = useState<TripPackingItemInput>(EMPTY_DRAFT);
  const [adding, setAdding] = useState<"shopping" | "packing" | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [shoppingCollapsed, setShoppingCollapsed] = useState(false);
  const [packingCollapsed, setPackingCollapsed] = useState(false);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [hidePacked, setHidePacked] = useState(false);
  const categoryNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...categoryConfigs.map((category) => category.name),
          ...items.map((item) => item.category),
        ]),
      ),
    [categoryConfigs, items],
  );

  const shoppingItems = items.filter((item) => item.acquisition === "buy");
  const packingItems = items.filter((item) => item.acquisition !== "buy");
  const purchasedCount = items.filter(
    (item) => item.acquisition === "buy" && item.isPurchased,
  ).length;
  const totalShoppingCount = shoppingItems.length;
  const shoppingBudget = items
    .filter((item) => item.acquisition === "buy")
    .reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const remainingBudget = shoppingItems
    .filter((item) => !item.isPurchased)
    .reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const shoppingProgress = totalShoppingCount
    ? Math.round((purchasedCount / totalShoppingCount) * 100)
    : 0;
  const packedCount = packingItems.filter((item) => item.isPacked).length;
  const packingProgress = packingItems.length
    ? Math.round((packedCount / packingItems.length) * 100)
    : 0;
  const categoryOrder = categoryConfigs.map((category) => category.name);
  const categoryColors = new Map(
    categoryConfigs.map((category) => [category.name, category.color]),
  );
  const visibleShoppingItems = hidePurchased
    ? shoppingItems.filter((item) => !item.isPurchased)
    : shoppingItems;
  const visiblePackingItems = hidePacked
    ? packingItems.filter((item) => !item.isPacked)
    : packingItems;
  const shoppingGroups = groupItemsByCategory(
    visibleShoppingItems,
    categoryOrder,
  );
  const packingGroups = groupItemsByCategory(
    visiblePackingItems,
    categoryOrder,
  );

  function submitDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;

    void onCreate(draft);
    setDraft(EMPTY_DRAFT);
    setAdding(null);
  }

  function cancelForm() {
    setDraft(EMPTY_DRAFT);
    setAdding(null);
  }

  function startAdding(section: "shopping" | "packing") {
    if (adding === section) {
      cancelForm();
      return;
    }
    setDraft({
      ...EMPTY_DRAFT,
      acquisition: section === "shopping" ? "buy" : "have",
      category: categoryConfigs[0]?.name ?? PACKING_CATEGORIES[0],
    });
    setAdding(section);
  }

  async function removeItem(item: TripPackingItemPlain) {
    const success = await onDelete(item.id);
    if (success) toast.success("Item removed.");
  }

  async function togglePurchase(item: TripPackingItemPlain) {
    const nextPurchased = !item.isPurchased;
    const updated = await onUpdate(item.id, {
      isPurchased: nextPurchased,
    });
    if (!updated) return;

    if (!nextPurchased) {
      toast.success("Marked as not bought.");
      return;
    }

    const copied = await onCreate({
      name: item.name,
      category: item.category,
      acquisition: "have",
      quantity: item.quantity,
      notes: item.notes,
      price: item.price,
      productLinks: item.productLinks,
      isPurchased: false,
      isPacked: false,
    });

    if (!copied) {
      await onUpdate(item.id, { isPurchased: false });
    }
  }

  return (
    <section className="mt-[18px]">
      <div className="rounded-[20px] border border-[#E7DFCE] bg-[#FBF8F1] p-4 shadow-sm md:rounded-[28px] md:p-8">
        <ListHeading
          icon={<ShoppingCart className="size-5 text-[#E4562A]" />}
          title="Shopping list"
          subtitle="Things to buy before departure."
          summary={`${purchasedCount}/${totalShoppingCount} bought`}
          adding={adding === "shopping"}
          onAdd={() => startAdding("shopping")}
          onManageCategories={() => setManagingCategories(true)}
          collapsed={shoppingCollapsed}
          onToggleCollapsed={() => setShoppingCollapsed((current) => !current)}
        />
        {!shoppingCollapsed && (
          <>
            {adding === "shopping" && (
              <NewItemForm
                mode="shopping"
                draft={draft}
                categories={categoryNames}
                onChange={setDraft}
                onSubmit={submitDraft}
                onCancel={cancelForm}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
              <SummaryTile
                label="Bought"
                value={`${purchasedCount}/${totalShoppingCount}`}
                tone="green"
              />
              <SummaryTile
                label="Remaining"
                value={formatPrice(remainingBudget)}
                tone="peach"
              />
              <SummaryTile
                label="Budget"
                value={formatPrice(shoppingBudget)}
                tone="neutral"
              />
            </div>
            <ProgressBar value={shoppingProgress} />
            <CompletedItemsToggle
              hidden={hidePurchased}
              count={purchasedCount}
              label="bought"
              onToggle={() => setHidePurchased((current) => !current)}
            />
            {visibleShoppingItems.length ? (
              <>
                <div className="mt-5 hidden md:block">
                  {shoppingGroups.map(([category, categoryItems]) => {
                    const allCategoryItems = items.filter(
                      (item) =>
                        item.acquisition === "buy" &&
                        item.category === category,
                    );
                    return (
                      <CategoryGroup
                        key={category}
                        category={category}
                        color={categoryColors.get(category) ?? "#6A6353"}
                        completed={
                          allCategoryItems.filter((item) => item.isPurchased)
                            .length
                        }
                        total={allCategoryItems.length}
                        statusLabel="bought"
                      >
                        {categoryItems.map((item) => (
                          <ShoppingRow
                            key={item.id}
                            item={item}
                            categories={categoryNames}
                            categoryColor={
                              categoryColors.get(item.category) ?? "#6A6353"
                            }
                            onPurchase={() => togglePurchase(item)}
                            onUpdate={(input) => onUpdate(item.id, input)}
                            onDelete={() => removeItem(item)}
                          />
                        ))}
                      </CategoryGroup>
                    );
                  })}
                </div>
                <div className="mt-5 md:hidden">
                  {shoppingGroups.map(([category, categoryItems]) => {
                    const allCategoryItems = items.filter(
                      (item) =>
                        item.acquisition === "buy" &&
                        item.category === category,
                    );
                    return (
                      <CategoryGroup
                        key={category}
                        category={category}
                        color={categoryColors.get(category) ?? "#6A6353"}
                        completed={
                          allCategoryItems.filter((item) => item.isPurchased)
                            .length
                        }
                        total={allCategoryItems.length}
                        statusLabel="bought"
                        mobile
                      >
                        <div className="space-y-1.5">
                          {categoryItems.map((item) => (
                            <ShoppingCard
                              key={item.id}
                              item={item}
                              categories={categoryNames}
                              categoryColor={
                                categoryColors.get(item.category) ?? "#6A6353"
                              }
                              onPurchase={() => togglePurchase(item)}
                              onUpdate={(input) => onUpdate(item.id, input)}
                              onDelete={() => removeItem(item)}
                            />
                          ))}
                        </div>
                      </CategoryGroup>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyList
                icon={<ShoppingCart className="size-7" />}
                title={
                  shoppingItems.length
                    ? "Bought items hidden"
                    : "Nothing to buy"
                }
                description={
                  shoppingItems.length
                    ? "Show bought items to see the complete shopping list."
                    : "Add the first item to your shopping list."
                }
              />
            )}
          </>
        )}
      </div>

      <div className="mt-4 rounded-[20px] border border-[#E7DFCE] bg-[#FBF8F1] p-4 shadow-sm md:mt-5 md:rounded-[28px] md:p-8">
        <ListHeading
          icon={<PackageCheck className="size-5 text-[#2E7A57]" />}
          title="Packing list"
          subtitle="Everything ready to put in the car."
          summary={`${packedCount}/${packingItems.length} packed`}
          adding={adding === "packing"}
          onAdd={() => startAdding("packing")}
          onManageCategories={() => setManagingCategories(true)}
          collapsed={packingCollapsed}
          onToggleCollapsed={() => setPackingCollapsed((current) => !current)}
        />
        {!packingCollapsed && (
          <>
            {adding === "packing" && (
              <NewItemForm
                mode="packing"
                draft={draft}
                categories={categoryNames}
                onChange={setDraft}
                onSubmit={submitDraft}
                onCancel={cancelForm}
              />
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
              <SummaryTile
                label="Packed"
                value={`${packedCount}/${packingItems.length}`}
                tone="green"
              />
              <SummaryTile
                label="Progress"
                value={`${packingProgress}%`}
                tone="neutral"
              />
            </div>
            <ProgressBar value={packingProgress} />
            <CompletedItemsToggle
              hidden={hidePacked}
              count={packedCount}
              label="packed"
              onToggle={() => setHidePacked((current) => !current)}
            />
            {visiblePackingItems.length ? (
              <>
                <div className="mt-5 hidden md:block">
                  {packingGroups.map(([category, categoryItems]) => (
                    <CategoryGroup
                      key={category}
                      category={category}
                      color={categoryColors.get(category) ?? "#6A6353"}
                      completed={
                        packingItems.filter(
                          (item) => item.category === category && item.isPacked,
                        ).length
                      }
                      total={
                        packingItems.filter(
                          (item) => item.category === category,
                        ).length
                      }
                      statusLabel="packed"
                    >
                      {categoryItems.map((item) => (
                        <PackingRow
                          key={item.id}
                          item={item}
                          categories={categoryNames}
                          categoryColor={
                            categoryColors.get(item.category) ?? "#6A6353"
                          }
                          onToggle={() =>
                            onUpdate(item.id, { isPacked: !item.isPacked })
                          }
                          onMoveToShopping={async () => {
                            const success = await onUpdate(item.id, {
                              acquisition: "buy",
                              isPurchased: false,
                              isPacked: false,
                            });
                            if (success)
                              toast.success("Moved to shopping list.");
                          }}
                          onUpdate={(input) => onUpdate(item.id, input)}
                          onDelete={() => removeItem(item)}
                        />
                      ))}
                    </CategoryGroup>
                  ))}
                </div>
                <div className="mt-5 md:hidden">
                  {packingGroups.map(([category, categoryItems]) => (
                    <CategoryGroup
                      key={category}
                      category={category}
                      color={categoryColors.get(category) ?? "#6A6353"}
                      completed={
                        packingItems.filter(
                          (item) => item.category === category && item.isPacked,
                        ).length
                      }
                      total={
                        packingItems.filter(
                          (item) => item.category === category,
                        ).length
                      }
                      statusLabel="packed"
                      mobile
                    >
                      <div className="space-y-1.5">
                        {categoryItems.map((item) => (
                          <PackingCard
                            key={item.id}
                            item={item}
                            categories={categoryNames}
                            categoryColor={
                              categoryColors.get(item.category) ?? "#6A6353"
                            }
                            onToggle={() =>
                              onUpdate(item.id, { isPacked: !item.isPacked })
                            }
                            onMoveToShopping={async () => {
                              const success = await onUpdate(item.id, {
                                acquisition: "buy",
                                isPurchased: false,
                                isPacked: false,
                              });
                              if (success)
                                toast.success("Moved to shopping list.");
                            }}
                            onUpdate={(input) => onUpdate(item.id, input)}
                            onDelete={() => removeItem(item)}
                          />
                        ))}
                      </div>
                    </CategoryGroup>
                  ))}
                </div>
              </>
            ) : (
              <EmptyList
                icon={<PackageCheck className="size-7" />}
                title={
                  packingItems.length
                    ? "Packed items hidden"
                    : "Nothing to pack yet"
                }
                description={
                  packingItems.length
                    ? "Show packed items to see the complete packing list."
                    : "Add the first item to your packing list."
                }
              />
            )}
          </>
        )}
      </div>
      {managingCategories && (
        <CategoryManager
          categories={categoryConfigs}
          onClose={() => setManagingCategories(false)}
          onSave={onUpdateCategories}
        />
      )}
    </section>
  );
}

type NewPackingItemProps = {
  mode: "shopping" | "packing";
  draft: TripPackingItemInput;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<TripPackingItemInput>>;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

function NewItemForm({
  mode,
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
      className={`mt-5 grid grid-cols-2 gap-2 border-y border-[#E9E0CF] bg-transparent px-1 py-2 md:items-center ${
        mode === "shopping"
          ? "md:grid-cols-[34px_minmax(150px,1.2fr)_145px_64px_minmax(130px,.75fr)_minmax(110px,.65fr)_74px]"
          : "md:grid-cols-[34px_minmax(180px,1.2fr)_160px_64px_minmax(160px,.8fr)_74px]"
      }`}
    >
      <span className="hidden aspect-square size-8 place-items-center rounded-[9px] bg-[#F0EADB] md:grid">
        <Plus className="size-4 text-[#E4562A]" />
      </span>

      <label className="col-span-2 md:col-span-1">
        <span className="sr-only">Item name</span>
        <input
          autoFocus
          value={draft.name}
          maxLength={120}
          onChange={(event) =>
            onChange((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={mode === "shopping" ? "Item to buy…" : "Item to pack…"}
          className={`${newItemInputClass} text-[14px] font-bold`}
        />
      </label>

      <label>
        <span className="sr-only">Category</span>
        <div>
          <select
            value={draft.category}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
            aria-label="Category"
            className={newItemInputClass}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
      </label>

      <label>
        <span className="sr-only">Quantity</span>
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
          aria-label="Quantity"
          title="Quantity"
          className={`${newItemInputClass} ${numberInputClass} text-center font-['JetBrains_Mono']`}
        />
      </label>

      <label className="col-span-2 md:col-span-1">
        <span className="sr-only">Note</span>
        <input
          value={draft.notes ?? ""}
          maxLength={500}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          placeholder="Optional note…"
          className={newItemInputClass}
        />
      </label>

      {mode === "shopping" ? (
        <label>
          <span className="sr-only">Estimated price</span>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={1_000_000}
              step="0.01"
              value={draft.price ?? ""}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  price:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }))
              }
              aria-label="Estimated price in PLN"
              placeholder="Price"
              className={`${newItemInputClass} ${numberInputClass} pr-9 text-right font-['JetBrains_Mono'] font-bold`}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#8A8270]">
              PLN
            </span>
          </div>
        </label>
      ) : null}

      <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
        <button
          type="submit"
          disabled={!draft.name.trim()}
          aria-label="Add item"
          title="Add item"
          className="grid size-9 place-items-center rounded-[10px] bg-[#2E7A57] text-white transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          title="Cancel"
          className="grid size-9 place-items-center rounded-[10px] text-[#8A8270] hover:bg-[#F0EADB]"
        >
          <X className="size-4" />
        </button>
      </div>
    </form>
  );
}

function ShoppingRow({
  item,
  categories,
  categoryColor,
  onPurchase,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  categoryColor: string;
  onPurchase: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group grid ${SHOPPING_TABLE_GRID} items-center gap-2 border-b border-[#E9E0CF] px-2 py-2.5 text-sm`}
    >
      <PackCheckbox
        checked={item.isPurchased}
        onClick={onPurchase}
        uncheckedLabel="Mark as bought"
        checkedLabel="Mark as not bought"
      />
      <InlineText
        value={item.name}
        disabled={item.isPurchased}
        ariaLabel="Item name"
        className={`pr-3 text-[15px] font-bold ${
          item.isPurchased ? "line-through text-[#A49B87]" : "text-[#16130D]"
        }`}
        onCommit={(name) => name.trim() && void onUpdate({ name })}
      />
      <InlineSelect
        value={item.category}
        disabled={item.isPurchased}
        ariaLabel="Category"
        options={categories.map((value) => ({ value, label: value }))}
        onChange={(category) => void onUpdate({ category })}
        className="px-3 text-center font-bold"
        style={categoryInputStyle(categoryColor)}
      />
      <InlineNumber
        value={item.quantity}
        disabled={item.isPurchased}
        onCommit={(quantity) => void onUpdate({ quantity })}
      />
      <InlineText
        value={item.notes ?? ""}
        disabled={item.isPurchased}
        ariaLabel="Note"
        placeholder="Add note"
        className="truncate text-[11px] text-[#A49B87]"
        onCommit={(notes) => void onUpdate({ notes })}
      />
      <PriceInput
        value={item.price}
        disabled={item.isPurchased}
        onCommit={(price) => void onUpdate({ price })}
      />
      <div className="flex justify-end gap-1">
        <ProductLinksButton
          links={item.productLinks}
          locked={item.isPurchased}
          onUpdate={(productLinks) => void onUpdate({ productLinks })}
        />
        {!item.isPurchased && <RowActions onDelete={onDelete} />}
      </div>
    </div>
  );
}

function ShoppingCard({
  item,
  categories,
  categoryColor,
  onPurchase,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  categoryColor: string;
  onPurchase: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`group rounded-[13px] border border-[#E7DFCE] px-2.5 py-2 ${
        item.isPurchased ? "bg-[#F4F7F2]" : "bg-[#fffaf0]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PackCheckbox
          checked={item.isPurchased}
          onClick={onPurchase}
          uncheckedLabel="Mark as bought"
          checkedLabel="Mark as not bought"
        />
        <InlineText
          value={item.name}
          disabled={item.isPurchased}
          ariaLabel="Item name"
          className={`flex-1 truncate px-1 text-[13px] font-bold ${
            item.isPurchased ? "line-through text-[#8A8270]" : ""
          }`}
          onCommit={(name) => name.trim() && void onUpdate({ name })}
        />
        <span className="shrink-0 text-[10px] font-bold text-[#A49B87]">×</span>
        <div className="w-8 shrink-0">
          <InlineNumber
            value={item.quantity}
            disabled={item.isPurchased}
            onCommit={(quantity) => void onUpdate({ quantity })}
          />
        </div>
        <div className="w-[72px] shrink-0">
          <PriceInput
            value={item.price}
            disabled={item.isPurchased}
            onCommit={(price) => void onUpdate({ price })}
          />
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((current) => !current)}
          className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[#8A8270] hover:bg-[#F0EADB]"
          aria-label={detailsOpen ? "Hide item details" : "Show item details"}
          aria-expanded={detailsOpen}
        >
          <ChevronDown
            className={`size-3.5 transition-transform ${
              detailsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border-t border-[#E9E0CF] pt-2">
          <div className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-1">
            <InlineSelect
              value={item.category}
              disabled={item.isPurchased}
              ariaLabel="Category"
              options={categories.map((value) => ({ value, label: value }))}
              onChange={(category) => void onUpdate({ category })}
              className="px-1.5 text-center text-[10px] font-bold"
              style={categoryInputStyle(categoryColor)}
            />
            <InlineText
              value={item.notes ?? ""}
              disabled={item.isPurchased}
              ariaLabel="Note"
              placeholder="Add note"
              className="w-full px-1 text-[10px] text-[#7a7264]"
              onCommit={(notes) => void onUpdate({ notes })}
            />
          </div>
          <div className="flex items-center">
            <ProductLinksButton
              links={item.productLinks}
              locked={item.isPurchased}
              onUpdate={(productLinks) => void onUpdate({ productLinks })}
            />
            {!item.isPurchased && <RowActions onDelete={onDelete} />}
          </div>
        </div>
      )}
    </div>
  );
}

function PackingRow({
  item,
  categories,
  categoryColor,
  onToggle,
  onMoveToShopping,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  categoryColor: string;
  onToggle: () => void;
  onMoveToShopping: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  const locked = item.isPacked || item.isPurchased;

  return (
    <div
      className={`group grid ${PACKING_TABLE_GRID} items-center gap-2 border-b border-[#E9E0CF] px-2 py-2.5 text-sm`}
    >
      <PackCheckbox checked={item.isPacked} onClick={onToggle} />
      <InlineText
        value={item.name}
        disabled={locked}
        ariaLabel="Item name"
        className={`pr-3 text-[15px] font-bold ${item.isPacked ? "line-through text-[#A49B87]" : "text-[#16130D]"}`}
        onCommit={(name) => name.trim() && void onUpdate({ name })}
      />
      <InlineSelect
        value={item.category}
        disabled={locked}
        ariaLabel="Category"
        options={categories.map((value) => ({ value, label: value }))}
        onChange={(category) => void onUpdate({ category })}
        className="px-3 text-center font-bold"
        style={categoryInputStyle(categoryColor)}
      />
      <InlineNumber
        value={item.quantity}
        disabled={locked}
        onCommit={(quantity) => void onUpdate({ quantity })}
      />
      <InlineText
        value={item.notes ?? ""}
        disabled={locked}
        ariaLabel="Note"
        placeholder="Add note"
        className="truncate text-[11px] text-[#A49B87]"
        onCommit={(notes) => void onUpdate({ notes })}
      />
      {!locked && (
        <RowActions onDelete={onDelete} onMoveToShopping={onMoveToShopping} />
      )}
    </div>
  );
}

function PackingCard({
  item,
  categories,
  categoryColor,
  onToggle,
  onMoveToShopping,
  onUpdate,
  onDelete,
}: {
  item: TripPackingItemPlain;
  categories: string[];
  categoryColor: string;
  onToggle: () => void;
  onMoveToShopping: () => void;
  onUpdate: (input: TripPackingItemUpdateInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  const locked = item.isPacked || item.isPurchased;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`group rounded-[13px] border border-[#E7DFCE] px-2.5 py-2 ${
        item.isPacked ? "bg-[#F4F7F2]" : "bg-[#fffaf0]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PackCheckbox checked={item.isPacked} onClick={onToggle} />
        <InlineText
          value={item.name}
          disabled={locked}
          ariaLabel="Item name"
          className={`flex-1 truncate px-1 text-[13px] font-bold ${item.isPacked ? "line-through text-[#8a8270]" : ""}`}
          onCommit={(name) => name.trim() && void onUpdate({ name })}
        />
        <span className="shrink-0 text-[10px] font-bold text-[#A49B87]">×</span>
        <div className="w-8 shrink-0">
          <InlineNumber
            value={item.quantity}
            disabled={locked}
            onCommit={(quantity) => void onUpdate({ quantity })}
          />
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((current) => !current)}
          className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[#8A8270] hover:bg-[#F0EADB]"
          aria-label={detailsOpen ? "Hide item details" : "Show item details"}
          aria-expanded={detailsOpen}
        >
          <ChevronDown
            className={`size-3.5 transition-transform ${
              detailsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border-t border-[#E9E0CF] pt-2">
          <div className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-1">
            <InlineSelect
              value={item.category}
              disabled={locked}
              ariaLabel="Category"
              options={categories.map((value) => ({ value, label: value }))}
              onChange={(category) => void onUpdate({ category })}
              className="px-1.5 text-center text-[10px] font-bold"
              style={categoryInputStyle(categoryColor)}
            />
            <InlineText
              value={item.notes ?? ""}
              disabled={locked}
              ariaLabel="Note"
              placeholder="Add note"
              className="w-full px-1 text-[10px] text-[#7a7264]"
              onCommit={(notes) => void onUpdate({ notes })}
            />
          </div>
          {!locked && (
            <RowActions
              onDelete={onDelete}
              onMoveToShopping={onMoveToShopping}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PackCheckbox({
  checked,
  onClick,
  uncheckedLabel = "Mark as packed",
  checkedLabel = "Mark as unpacked",
}: {
  checked: boolean;
  onClick: () => void;
  uncheckedLabel?: string;
  checkedLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={checked ? checkedLabel : uncheckedLabel}
      className={`grid size-6 shrink-0 place-items-center rounded-[6px] border transition-colors ${
        checked
          ? "border-[#2E7A57] bg-[#2E7A57] text-white"
          : "border-[#D8CEB8] bg-transparent text-transparent hover:border-[#2E7A57]"
      }`}
    >
      <Check className="size-3.5" />
    </button>
  );
}

function ProductLinksButton({
  links,
  locked,
  onUpdate,
}: {
  links: ProductLink[];
  locked: boolean;
  onUpdate: (links: ProductLink[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState(links);
  const [newUrl, setNewUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => setDrafts(links), [links]);
  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function commit(link: ProductLink) {
    const normalized = normalizeProductUrl(link.url);
    if (!normalized || !link.label.trim()) {
      setDrafts(links);
      toast.error("Enter a valid link and name.");
      return;
    }
    const next = drafts.map((item) =>
      item.id === link.id
        ? { ...link, label: link.label.trim(), url: normalized }
        : item,
    );
    setDrafts(next);
    onUpdate(next);
  }

  function addLink() {
    const url = normalizeProductUrl(newUrl);
    if (!url) {
      toast.error("Enter a valid product URL.");
      return;
    }
    const link = {
      id: crypto.randomUUID(),
      label: productLinkLabel(url),
      url,
    };
    const next = [...drafts, link];
    setDrafts(next);
    setNewUrl("");
    onUpdate(next);
  }

  return (
    <div ref={containerRef} className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Product links"
        title="Product links"
        className={`relative grid size-8 place-items-center rounded-[9px] transition-[color,background-color,opacity] ${
          links.length
            ? "bg-[#E8F0F6] text-[#3F6A8C]"
            : "text-[#A49B87] opacity-0 hover:bg-[#F0EADB] group-hover:opacity-100 focus:opacity-100"
        }`}
      >
        <Link2 className="size-3.5" />
        {links.length > 1 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#16130D] px-1 text-[9px] font-bold text-white">
            {links.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[310px] rounded-[18px] border border-[#E7DFCE] bg-[#FBF8F1] p-3 shadow-[0_18px_50px_rgba(22,19,13,0.2)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Product links</div>
              <div className="text-[10px] font-semibold text-[#8A8270]">
                {locked
                  ? "Links are read-only after purchase."
                  : "Compare offers and shops."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close product links"
              className="grid size-7 place-items-center rounded-lg text-[#8A8270] hover:bg-[#F0EADB]"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {drafts.map((link) => (
              <div
                key={link.id}
                className="grid grid-cols-[minmax(0,1fr)_30px] gap-1.5 rounded-[12px] border border-[#E7DFCE] p-2"
              >
                <div className="min-w-0 space-y-1">
                  <input
                    value={link.label}
                    disabled={locked}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.id === link.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      )
                    }
                    onBlur={() =>
                      commit(drafts.find((item) => item.id === link.id) ?? link)
                    }
                    aria-label="Link name"
                    className="h-7 w-full rounded-lg border border-transparent bg-transparent px-1.5 text-xs font-bold outline-none enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8]"
                  />
                  <input
                    value={link.url}
                    disabled={locked}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.id === link.id
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      )
                    }
                    onBlur={() =>
                      commit(drafts.find((item) => item.id === link.id) ?? link)
                    }
                    aria-label="Product URL"
                    className="h-7 w-full truncate rounded-lg border border-transparent bg-transparent px-1.5 text-[10px] font-medium text-[#8A8270] outline-none enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${link.label}`}
                    className="grid size-7 place-items-center rounded-lg text-[#3F6A8C] hover:bg-[#E8F0F6]"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = drafts.filter(
                          (item) => item.id !== link.id,
                        );
                        setDrafts(next);
                        onUpdate(next);
                      }}
                      aria-label={`Delete ${link.label}`}
                      className="grid size-7 place-items-center rounded-lg text-[#B8431F] hover:bg-[#FBE7DD]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!locked && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={newUrl}
                onChange={(event) => setNewUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Paste product URL…"
                aria-label="New product URL"
                className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#D8CEB8] bg-transparent px-2.5 text-xs outline-none focus:ring-2 focus:ring-[#D8CEB8]/25"
              />
              <button
                type="button"
                onClick={addLink}
                disabled={!newUrl.trim()}
                aria-label="Add product link"
                className="grid size-9 place-items-center rounded-[10px] bg-[#16130D] text-white disabled:opacity-30"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function normalizeProductUrl(value: string) {
  const candidate = /^https?:\/\//i.test(value.trim())
    ? value.trim()
    : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function productLinkLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Product link";
  }
}

function RowActions({
  onDelete,
  onMoveToShopping,
}: {
  onDelete: () => void;
  onMoveToShopping?: () => void;
}) {
  return (
    <div className="flex justify-end gap-0.5 md:gap-1">
      {onMoveToShopping && (
        <button
          type="button"
          onClick={onMoveToShopping}
          aria-label="Move to shopping list"
          title="Move to shopping list"
          className="grid size-7 place-items-center rounded-[8px] text-[#B3A994] opacity-100 transition-[color,background-color,opacity] hover:bg-[#F0EADB] hover:text-[#6A6353] md:size-8 md:rounded-[9px] md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        >
          <ShoppingCart className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete item"
        className="grid size-7 place-items-center rounded-[8px] text-[#B3A994] opacity-100 transition-[color,background-color,opacity] hover:bg-[#F0EADB] hover:text-[#B8431F] md:size-8 md:rounded-[9px] md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
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
  disabled = false,
}: {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
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
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`min-w-0 rounded-[10px] border border-transparent bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-[#B3A994] enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8] enabled:focus:ring-2 enabled:focus:ring-[#D8CEB8]/25 disabled:cursor-default ${className}`}
    />
  );
}

function InlineNumber({
  value,
  onCommit,
  disabled = false,
}: {
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
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
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      aria-label="Quantity"
      className={`min-w-0 rounded-[10px] border border-transparent bg-transparent px-2 py-1 font-['JetBrains_Mono'] text-xs font-bold outline-none transition-colors enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8] enabled:focus:ring-2 enabled:focus:ring-[#D8CEB8]/25 disabled:cursor-default ${numberInputClass}`}
    />
  );
}

function PriceInput({
  value,
  onCommit,
  disabled = false,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(
    value === null ? "" : String(value),
  );
  useEffect(() => setLocalValue(value === null ? "" : String(value)), [value]);

  function commit() {
    const parsed = localValue.trim() === "" ? null : Number(localValue);
    const next =
      parsed === null || !Number.isFinite(parsed)
        ? null
        : Math.max(0, Math.min(1_000_000, parsed));
    setLocalValue(next === null ? "" : String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <label className="relative min-w-0">
      <input
        type="number"
        min={0}
        max={1_000_000}
        step="0.01"
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={commit}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label="Price in PLN"
        placeholder="0.00"
        className={`min-w-0 w-full rounded-[10px] border border-transparent bg-transparent py-1 pl-2 pr-8 text-right font-['JetBrains_Mono'] text-xs font-bold outline-none transition-colors placeholder:text-[#B3A994] enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8] enabled:focus:ring-2 enabled:focus:ring-[#D8CEB8]/25 disabled:cursor-default ${numberInputClass}`}
      />
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8a8270]">
        PLN
      </span>
    </label>
  );
}

function InlineSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  style,
  disabled = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      disabled={disabled}
      style={style}
      className={`min-w-0 rounded-[10px] border border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-[#7a7264] outline-none transition-colors enabled:hover:border-[#E7DFCE] enabled:focus:border-[#D8CEB8] enabled:focus:ring-2 enabled:focus:ring-[#D8CEB8]/25 disabled:cursor-default disabled:opacity-100 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CategoryManager({
  categories,
  onClose,
  onSave,
}: {
  categories: PackingCategory[];
  onClose: () => void;
  onSave: (categories: PackingCategory[]) => Promise<boolean>;
}) {
  const [drafts, setDrafts] = useState(() =>
    categories.map((category) => ({ ...category })),
  );
  const [saving, setSaving] = useState(false);

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= drafts.length) return;
    setDrafts((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save() {
    if (drafts.some((category) => !category.name.trim())) {
      toast.error("Every category needs a name.");
      return;
    }
    setSaving(true);
    const success = await onSave(
      drafts.map((category) => ({
        ...category,
        name: category.name.trim(),
      })),
    );
    setSaving(false);
    if (success) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#16130D]/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
        className="w-full max-w-lg overflow-hidden rounded-[24px] border border-[#E7DFCE] bg-[#FBF8F1] shadow-[0_24px_80px_rgba(22,19,13,0.28)]"
      >
        <div className="flex items-start justify-between border-b border-[#E9E0CF] px-5 py-4">
          <div>
            <h3
              id="category-manager-title"
              className="font-['Bricolage_Grotesque'] text-xl font-extrabold"
            >
              Manage categories
            </h3>
            <p className="mt-1 text-xs font-medium text-[#8A8270]">
              Shared by the shopping and packing lists for this trip.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-[10px] text-[#8A8270] hover:bg-[#F0EADB]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
          {drafts.map((category, index) => (
            <div
              key={category.id}
              className="grid grid-cols-[42px_minmax(0,1fr)_68px] items-center gap-2 rounded-[14px] border border-[#E7DFCE] px-2 py-2"
            >
              <label
                className="relative grid size-9 place-items-center rounded-[10px]"
                style={{ background: `${category.color}20` }}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ background: category.color }}
                />
                <input
                  type="color"
                  value={category.color}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((item) =>
                        item.id === category.id
                          ? { ...item, color: event.target.value }
                          : item,
                      ),
                    )
                  }
                  aria-label={`Color for ${category.name}`}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <input
                value={category.name}
                maxLength={60}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === category.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                aria-label="Category name"
                className="h-9 min-w-0 rounded-[10px] border border-transparent bg-transparent px-2 text-sm font-bold outline-none hover:border-[#E7DFCE] focus:border-[#D8CEB8] focus:ring-2 focus:ring-[#D8CEB8]/25"
              />
              <div className="flex justify-end gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move category up"
                  className="grid size-7 place-items-center rounded-lg text-[#8A8270] hover:bg-[#F0EADB] disabled:opacity-25"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="Move category down"
                  className="grid size-7 place-items-center rounded-lg text-[#8A8270] hover:bg-[#F0EADB] disabled:opacity-25"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((current) =>
                      current.filter((item) => item.id !== category.id),
                    )
                  }
                  disabled={drafts.length === 1}
                  aria-label="Delete category"
                  className="grid size-7 place-items-center rounded-lg text-[#B8431F] hover:bg-[#FBE7DD] disabled:opacity-25"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDrafts((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: "New category",
                  color: "#E4562A",
                },
              ])
            }
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#D8CEB8] text-sm font-bold text-[#6A6353] hover:bg-[#F0EADB]"
          >
            <Plus className="size-4" />
            Add category
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E9E0CF] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[12px] px-4 text-sm font-bold text-[#6A6353] hover:bg-[#F0EADB]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-10 rounded-[12px] bg-[#16130D] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save categories"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function ListHeading({
  icon,
  title,
  subtitle,
  summary,
  adding,
  onAdd,
  onManageCategories,
  collapsed,
  onToggleCollapsed,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  summary: string;
  adding: boolean;
  onAdd: () => void;
  onManageCategories: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div className="relative flex min-h-8 min-w-0 items-center justify-between gap-2 md:items-start md:gap-4">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        aria-expanded={!collapsed}
        className="absolute inset-0 z-0 cursor-pointer rounded-[16px]"
      />
      <div className="pointer-events-none relative z-[1] min-w-0">
        <div className="flex items-center gap-1.5 md:gap-2">
          {icon}
          <h3 className="m-0 truncate font-['Bricolage_Grotesque'] text-[17px] font-extrabold tracking-[-0.02em] md:text-[22px] md:tracking-[-0.025em]">
            {title}
          </h3>
        </div>
        <p className="mt-1 hidden text-[13px] font-medium text-[#8a8270] sm:block">
          {subtitle}
        </p>
      </div>
      <div className="relative z-[1] flex shrink-0 items-center gap-1 md:gap-2">
        <span className="hidden text-xs font-semibold text-[#8A8270] sm:inline">
          {summary}
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          aria-expanded={!collapsed}
          className="hidden size-10 place-items-center rounded-[13px] border border-[#D8CEB8] bg-transparent text-[#6A6353] transition-colors hover:bg-[#F0EADB] md:grid"
        >
          <ChevronDown
            className={`size-4 transition-transform ${
              collapsed ? "-rotate-90" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={onManageCategories}
          aria-label="Manage categories"
          title="Manage categories"
          className="grid size-8 place-items-center rounded-[10px] border border-[#D8CEB8] bg-transparent text-[#6A6353] transition-colors hover:bg-[#F0EADB] md:size-10 md:rounded-[13px]"
        >
          <Settings2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex size-8 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#16130D] text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-px md:h-10 md:w-auto md:rounded-[13px] md:px-4"
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          <span className="hidden md:inline">
            {adding ? "Cancel" : "Add item"}
          </span>
        </button>
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  color,
  completed,
  total,
  statusLabel,
  mobile = false,
  children,
}: {
  category: string;
  color: string;
  completed: number;
  total: number;
  statusLabel: "bought" | "packed";
  mobile?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="mt-4 first:mt-0 md:mt-6">
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-[#F3EDE1]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4562A]/30 ${
          collapsed ? "py-1" : "mb-2 py-1"
        }`}
      >
        <span className="grid aspect-square size-8 shrink-0 place-items-center rounded-[10px] bg-[#F0EADB]">
          <span
            className="aspect-square size-3 rounded-full"
            style={{ background: color }}
          />
        </span>
        <h4 className="m-0 text-[15px] font-extrabold text-[#16130D]">
          {category}
        </h4>
        <span className="whitespace-nowrap text-xs font-semibold text-[#A49B87]">
          {completed}/{total} {statusLabel}
        </span>
        <span className="h-px min-w-5 flex-1 bg-[#E9E0CF]" />
        <ChevronDown
          className={`mr-1 size-4 shrink-0 text-[#8A8270] transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      {!collapsed && <div className={mobile ? "" : "pl-10"}>{children}</div>}
    </section>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E8E0CF]">
      <div
        className="h-full rounded-full bg-[#2E7A57] transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function CompletedItemsToggle({
  hidden,
  count,
  label,
  onToggle,
}: {
  hidden: boolean;
  count: number;
  label: "bought" | "packed";
  onToggle: () => void;
}) {
  if (!count) return null;

  return (
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={hidden}
        className={`inline-flex h-8 items-center gap-2 rounded-[10px] border px-3 text-[11px] font-bold transition-colors ${
          hidden
            ? "border-[#D8CEB8] bg-[#F0EADB] text-[#6A6353]"
            : "border-transparent text-[#8A8270] hover:border-[#E1D8C5] hover:bg-[#F5F0E6]"
        }`}
      >
        {hidden ? (
          <Eye className="size-3.5" />
        ) : (
          <EyeOff className="size-3.5" />
        )}
        {hidden ? `Show ${label}` : `Hide ${label}`}
        <span className="grid min-w-5 place-items-center rounded-full bg-white/70 px-1.5 py-0.5 font-['JetBrains_Mono'] text-[9px]">
          {count}
        </span>
      </button>
    </div>
  );
}

function EmptyList({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[#D8CEB8] px-5 py-8 text-center text-[#C8BDA5]">
      <div className="mx-auto grid place-items-center">{icon}</div>
      <div className="mt-3 text-sm font-bold text-[#16130D]">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-[#8a8270]">
        {description}
      </p>
    </div>
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
    <div
      className={`min-w-0 rounded-[12px] px-2 py-2.5 md:rounded-[15px] md:px-4 md:py-3.5 ${colors[tone]}`}
    >
      <div className="truncate text-[8px] font-bold uppercase tracking-[.06em] opacity-85 md:text-[9px] md:tracking-[.08em]">
        {label}
      </div>
      <div className="mt-1 truncate font-['JetBrains_Mono'] text-[13px] font-bold leading-none tracking-[-0.04em] text-[#16130D] sm:text-[15px] md:mt-1.5 md:text-[22px]">
        {value}
      </div>
    </div>
  );
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} PLN`;
}

function categoryInputStyle(color: string): React.CSSProperties {
  return { background: `${color}18`, color };
}

function groupItemsByCategory(
  items: TripPackingItemPlain[],
  categoryOrder: string[],
) {
  const grouped = new Map<string, TripPackingItemPlain[]>();
  for (const item of items) {
    const group = grouped.get(item.category) ?? [];
    group.push(item);
    grouped.set(item.category, group);
  }
  return Array.from(grouped.entries()).sort(([categoryA], [categoryB]) => {
    const indexA = categoryOrder.indexOf(categoryA);
    const indexB = categoryOrder.indexOf(categoryB);
    if (indexA === -1 && indexB === -1)
      return categoryA.localeCompare(categoryB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

const newItemInputClass =
  "h-9 w-full rounded-[10px] border border-transparent bg-transparent px-2.5 text-sm font-medium text-[#16130D] outline-none transition-colors placeholder:text-[#B3A994] hover:border-[#E7DFCE] focus:border-[#D8CEB8] focus:ring-2 focus:ring-[#D8CEB8]/25";

const numberInputClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
