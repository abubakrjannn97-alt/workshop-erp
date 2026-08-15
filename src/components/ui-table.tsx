import type { ReactNode } from "react";

export function UiTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-table-wrap ${className}`.trim()}>{children}</div>;
}
