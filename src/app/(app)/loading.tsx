import { MobilePageSkeleton } from "@/components/mobile-page-skeleton";

export default function AppLoading() {
  return (
    <>
      <div className="lg:hidden">
        <MobilePageSkeleton />
      </div>
      <div className="hidden animate-pulse space-y-3 p-1 lg:block">
        <div className="h-14 rounded-xl bg-[var(--color-surface-muted)]" />
        <div className="h-48 rounded-xl bg-[var(--color-surface-muted)]" />
      </div>
    </>
  );
}
