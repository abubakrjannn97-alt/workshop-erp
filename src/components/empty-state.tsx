import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
          <Icon size={20} strokeWidth={1.5} />
        </span>
      ) : null}
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
