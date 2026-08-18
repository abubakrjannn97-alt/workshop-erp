import type { ReactNode } from "react";

export { UiTable } from "./ui-table";
export {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
  type DataListLayout,
  type DataListMetricTone,
} from "./data-list";

/** Card shell for list/table sections (orders, materials, warehouse, etc.). */
export function DataTableSection({
  children,
  className = "",
  tour,
}: {
  children: ReactNode;
  className?: string;
  tour?: string;
}) {
  return (
    <section
      className={`overflow-hidden ui-card ${className}`.trim()}
      {...(tour ? { "data-tour": tour } : {})}
    >
      {children}
    </section>
  );
}
