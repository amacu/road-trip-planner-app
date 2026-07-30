import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TripFormValues = {
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
  dayCount?: number | null;
};

export function TripFormFields<T extends FieldValues & TripFormValues>({
  idPrefix,
  register,
  errors,
  autoFocusName,
  layout = "stacked",
}: {
  idPrefix: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  autoFocusName?: boolean;
  layout?: "stacked" | "settings";
}) {
  const fieldClass =
    "space-y-2 [&_label]:text-[10px] [&_label]:font-black [&_label]:uppercase [&_label]:tracking-[0.12em] [&_label]:text-[#8A8270]";
  const controlClass =
    "h-11 rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] px-3.5 shadow-none transition-all focus-visible:border-brand/60 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand/15";

  return (
    <div
      className={cn(
        layout === "settings" ? "grid gap-4 sm:grid-cols-2" : "space-y-4",
      )}
    >
      <div className={cn(fieldClass, layout === "settings" && "sm:col-span-2")}>
        <Label htmlFor={`${idPrefix}-name`}>Trip name</Label>
        <Input
          id={`${idPrefix}-name`}
          autoFocus={autoFocusName}
          maxLength={80}
          placeholder="e.g. Route 66 Adventure"
          className={controlClass}
          {...register("name" as Path<T>)}
        />
        {errors?.name && (
          <p className="text-xs font-medium text-destructive">
            {errors.name.message as string}
          </p>
        )}
      </div>

      <div className={cn(fieldClass, layout === "settings" && "sm:col-span-2")}>
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          maxLength={300}
          rows={2}
          placeholder="Optional"
          className="min-h-[88px] resize-none rounded-[12px] border-[#D8CEB8] bg-[#FFFCF6] px-3.5 py-3 shadow-none transition-all focus-visible:border-brand/60 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand/15"
          {...register("description" as Path<T>)}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor={`${idPrefix}-start`}>Start date</Label>
        <Input
          id={`${idPrefix}-start`}
          type="date"
          className={controlClass}
          {...register("startDate" as Path<T>)}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor={`${idPrefix}-days`}>Number of days</Label>
        <Input
          id={`${idPrefix}-days`}
          type="number"
          min={1}
          max={365}
          placeholder="Flexible"
          className={controlClass}
          {...register("dayCount" as Path<T>, {
            setValueAs: (value) => (value === "" ? null : Number(value)),
          })}
        />
        <p className="text-[10px] font-medium text-[#A09888]">
          Optional. Leave empty for a flexible trip.
        </p>
        {errors?.dayCount && (
          <p className="text-xs font-medium text-destructive">
            {errors.dayCount.message as string}
          </p>
        )}
      </div>
    </div>
  );
}
