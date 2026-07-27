import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type TripFormValues = {
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
};

export function TripFormFields<T extends FieldValues & TripFormValues>({
  idPrefix,
  register,
  errors,
  autoFocusName,
}: {
  idPrefix: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  autoFocusName?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Trip name</Label>
        <Input
          id={`${idPrefix}-name`}
          autoFocus={autoFocusName}
          maxLength={80}
          placeholder="e.g. Route 66 Adventure"
          className="bg-white"
          {...register("name" as Path<T>)}
        />
        {errors?.name && (
          <p className="text-xs font-medium text-destructive">
            {errors.name.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          maxLength={300}
          rows={2}
          placeholder="Optional"
          className="resize-none bg-white"
          {...register("description" as Path<T>)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-start`}>Start date</Label>
        <Input
          id={`${idPrefix}-start`}
          type="date"
          className="bg-white"
          {...register("startDate" as Path<T>)}
        />
      </div>
    </>
  );
}
