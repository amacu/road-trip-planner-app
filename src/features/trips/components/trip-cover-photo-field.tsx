"use client";

import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadTripHeroImageAction } from "@/features/trips/actions";
import { compressImage } from "@/lib/image-compression";

export function TripCoverPhotoField({
  tripId,
  heroImageUrl,
}: {
  tripId: string;
  heroImageUrl: string | null;
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
    <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black tracking-tight">Cover photo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shown at the top of the trip overview. JPEG, PNG, WEBP, or GIF, up to
        8MB.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-brand to-[#f0834f]">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-white/70">
              <ImagePlus className="size-6" />
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
        </div>

        <div>
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
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <Camera className="size-4" />
            {heroImageUrl ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
