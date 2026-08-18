import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

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
    <EmptyState
      icon={Inbox}
      title={message}
      action={
        actionHref && actionLabel ? (
          <Link href={actionHref} className="ui-btn-primary">
            {actionLabel}
          </Link>
        ) : undefined
      }
    />
  );
}
