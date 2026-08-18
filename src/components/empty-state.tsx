import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ICON_STROKE } from "@/components/nav-icons";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="empty-state" role="status">
      {Icon ? (
        <span className="empty-state-icon">
          <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
        </span>
      ) : null}
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
