"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTripAction } from "@/features/trips/actions";
import { TripFormFields } from "@/features/trips/components/trip-form-fields";
import { tripCreateSchema, type TripCreateInput } from "@/lib/validators/trip";

export function NewTripDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripCreateInput>({
    resolver: zodResolver(tripCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      dayCount: null,
    },
  });

  async function onSubmit(data: TripCreateInput) {
    const result = await createTripAction(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    reset();
    onOpenChange(false);
    router.push(`/trips/${result.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Trip</DialogTitle>
          <DialogDescription>
            Give your road trip a name and rough dates.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <TripFormFields
            idPrefix="trip"
            register={register}
            errors={errors}
            autoFocusName
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand font-semibold text-brand-foreground hover:bg-brand/90"
            >
              {isSubmitting ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
