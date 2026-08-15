export function MobilePageSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-1 py-2 lg:hidden">
      <div className="h-16 rounded-2xl bg-white/70" />
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-full bg-white/60" />
        <div className="h-8 w-24 rounded-full bg-white/60" />
        <div className="h-8 w-20 rounded-full bg-white/60" />
      </div>
      <div className="space-y-2 rounded-3xl bg-white/80 p-3">
        <div className="h-20 rounded-2xl bg-[#F3F4F7]" />
        <div className="h-20 rounded-2xl bg-[#F3F4F7]" />
        <div className="h-20 rounded-2xl bg-[#F3F4F7]" />
      </div>
    </div>
  );
}
