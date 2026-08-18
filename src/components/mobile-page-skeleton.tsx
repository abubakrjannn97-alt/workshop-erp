export function MobilePageSkeleton() {
  return (
    <div className="space-y-3 px-1 py-2 lg:hidden" aria-hidden>
      <div className="ui-skeleton h-16 rounded-2xl" />
      <div className="flex gap-2">
        <div className="ui-skeleton h-8 w-20 rounded-full" />
        <div className="ui-skeleton h-8 w-24 rounded-full" />
        <div className="ui-skeleton h-8 w-20 rounded-full" />
      </div>
      <div className="space-y-2 rounded-3xl bg-white/80 p-3">
        <div className="ui-skeleton h-20 rounded-2xl" />
        <div className="ui-skeleton h-20 rounded-2xl" />
        <div className="ui-skeleton h-20 rounded-2xl" />
      </div>
    </div>
  );
}
