import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex h-8 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 transition-colors hover:border-[var(--color-border-input)] hover:bg-[var(--color-surface-soft)]"
    >
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
        <Icon size={12} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--color-text-primary)]">{label}</span>
      <ChevronRight
        size={12}
        strokeWidth={1.5}
        className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]"
      />
    </Link>
  );
}
