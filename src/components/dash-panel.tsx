import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ICON_STROKE } from "@/components/nav-icons";

export function DashPanel({
  title,
  icon: Icon,
  children,
  className = "",
  action,
  tour,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  tour?: string;
}) {
  return (
    <section className={`ui-card ui-card-panel ${className}`.trim()} data-tour={tour}>
      <div className="ui-card-head">
        <h2 className="section-title">
          {Icon ? (
            <span className="section-title-icon">
              <Icon size={14} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
          ) : null}
          {title}
        </h2>
        {action}
      </div>
      <div className="ui-card-body">{children}</div>
    </section>
  );
}
