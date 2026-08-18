import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

export function ErrorState({
  title,
  description,
  action,
  icon: Icon = CircleAlert,
  variant = "section",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  variant?: "page" | "section" | "inline";
}) {
  const role = variant === "inline" ? "alert" : "group";
  const padding = variant === "inline" ? "p-3" : variant === "page" ? "p-8" : "p-6";

  return (
    <div className={`error-state ${padding}`} role={role} aria-live="polite">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="error-state-title">{title}</p>
      {description ? <p className="error-state-desc">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
