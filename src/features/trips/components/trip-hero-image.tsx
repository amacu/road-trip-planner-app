"use client";

import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadTripHeroImageAction } from "@/features/trips/actions";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

export function TripHeroImage({
  tripId,
  heroImageUrl,
  canEdit,
  children,
}: {
  tripId: string;
  heroImageUrl: string | null;
  canEdit: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.set("file", compressed);

    const result = await uploadTripHeroImageAction(tripId, formData);
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.error);
      setPreview(null);
      return;
    }

    toast.success("Cover photo updated.");
    router.refresh();
  }

  const displayUrl = preview ?? heroImageUrl;

  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-brand to-[#f0834f] shadow-sm">
      <div className="absolute inset-0">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/70">
            <ImagePlus className="size-10" />
          </div>
        )}
        {displayUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/70" />
        )}
      </div>

      <div className="relative flex min-h-[320px] flex-col justify-end p-5 md:p-8">
        {children}
      </div>

      {isUploading && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      {canEdit && !isUploading && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title={heroImageUrl ? "Change cover photo" : "Add cover photo"}
            className={cn(
              "absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/35 text-white hover:bg-black/50",
            )}
          >
            <Camera className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
