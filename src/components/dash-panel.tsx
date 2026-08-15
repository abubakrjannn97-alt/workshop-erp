import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DashPanel({
  title,
  icon: Icon,
  children,
  className = "",
  action,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`ui-card ui-card-panel ${className}`.trim()}>
      <div className="ui-card-head">
        <h2 className="section-title">
          {Icon ? (
            <span className="section-title-icon">
              <Icon size={12} strokeWidth={1.6} />
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
