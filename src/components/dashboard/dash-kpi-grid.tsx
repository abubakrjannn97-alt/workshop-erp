import type { ReactNode } from "react";

export function DashKpiGrid({
  children,
  className = "",
  cols = "auto",
  tour,
}: {
  children: ReactNode;
  className?: string;
  cols?: "auto" | "2" | "3" | "4" | "5";
  tour?: string;
}) {
  const colClass =
    cols === "2"
      ? "sm:grid-cols-2"
      : cols === "3"
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === "4"
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : cols === "5"
            ? "sm:grid-cols-2 lg:grid-cols-5"
            : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-2 ${colClass} ${className}`.trim()} {...(tour ? { "data-tour": tour } : {})}>
      {children}
    </div>
  );
}
