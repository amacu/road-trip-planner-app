export default function Loading() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-[#F3EDE1]">
      <div className="mx-auto w-full max-w-[1040px] animate-pulse px-5 py-8 sm:px-8 md:py-12">
        <div className="mb-7 h-4 w-28 rounded-full bg-[#DDD4C2]" />
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-[300px] rounded-[24px] bg-[#28231D]" />
          <div className="rounded-[24px] border border-[#DED3C0] bg-[#FFFCF6] p-8">
            <div className="h-8 w-48 rounded-lg bg-[#E7DFCE]" />
            <div className="mt-3 h-4 w-72 max-w-full rounded bg-[#EFE8DA]" />
            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <div className="h-12 rounded-[12px] bg-[#EFE8DA]" />
              <div className="h-12 rounded-[12px] bg-[#EFE8DA]" />
              <div className="h-12 rounded-[12px] bg-[#EFE8DA] sm:col-span-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
