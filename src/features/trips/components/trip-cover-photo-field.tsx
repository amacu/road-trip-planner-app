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
    <div className="relative overflow-hidden rounded-[22px] border border-[#D8CEB8] bg-[#E4562A] shadow-[0_12px_30px_rgba(22,19,13,0.1)]">
      <div className="relative h-[170px]">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_75%_20%,#F6A07D_0,transparent_35%),linear-gradient(135deg,#E4562A,#B8431F)] text-white/75">
            <ImagePlus className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16130D]/75 via-[#16130D]/10 to-transparent" />
        {isUploading && (
          <div className="absolute inset-0 grid place-items-center bg-[#16130D]/45 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">
              Trip cover
            </p>
            <p className="mt-1 text-sm font-bold">
              Set the mood for your route
            </p>
          </div>
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
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[11px] border border-white/35 bg-white/90 px-3.5 text-xs font-black text-[#16130D] shadow-lg backdrop-blur transition hover:bg-white disabled:opacity-50"
          >
            <Camera className="size-4 text-brand" />
            {heroImageUrl ? "Change" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
