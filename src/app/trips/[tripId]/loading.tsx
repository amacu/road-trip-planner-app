import { MapPin } from "lucide-react";

import { AppLogo } from "@/components/shared/app-logo";

export default function Loading() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#F3EEE4] px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(22,19,13,.055)_1px,transparent_1px)] bg-[length:24px_24px]" />

      <div className="relative flex flex-col items-center text-center">
        <AppLogo className="mb-10" />

        <div className="relative h-12 w-48">
          <span className="absolute left-1 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#E4562A] bg-[#F3EEE4]" />
          <span className="absolute left-5 right-5 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#C9BDA8]" />
          <span className="absolute left-5 top-1/2 h-0.5 w-16 -translate-y-1/2 animate-[loading-route_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#E4562A] to-transparent" />
          <span className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[10px] bg-[#E4562A] text-white shadow-[0_7px_18px_rgba(228,86,42,.25)]">
            <MapPin className="size-4" />
          </span>
        </div>

        <p className="mt-5 text-sm font-black text-[#302B23]">
          Loading your trip
        </p>
        <p className="mt-1 text-xs font-semibold text-[#918775]">
          Getting the route ready…
        </p>
      </div>
    </main>
  );
}
