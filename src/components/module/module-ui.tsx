import type { ReactNode } from "react";
import Link from "next/link";

export function ModuleToolbar({
  children,
  className = "",
  tour,
}: {
  children: ReactNode;
  className?: string;
  tour?: string;
}) {
  return (
    <form
      className={`ui-card flex flex-wrap items-end gap-2 p-3 ${className}`.trim()}
      {...(tour ? { "data-tour": tour } : {})}
    >
      {children}
    </form>
  );
}

export function ModuleEmpty({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="ui-card px-4 py-8 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="ui-btn-primary mt-4 inline-flex min-h-[44px] items-center">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
