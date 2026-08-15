import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="ui-label mb-1">{label}</span>
      {children}
      {hint ? <span className="ui-hint mt-1 block leading-snug">{hint}</span> : null}
    </label>
  );
}
