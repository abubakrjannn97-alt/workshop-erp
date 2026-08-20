import {
  ANALYTICS_ITEM,
  APPROVALS_ITEM,
  BATCHES_ITEM,
  COMMISSION_ITEM,
  CRM_ITEM,
  EMPLOYEES_ITEM,
  EXPENSES_ITEM,
  FINANCE_ITEM,
  HELP_ITEM,
  HISTORY_ITEM,
  HOME_ITEM,
  INVENTORY_ITEM,
  JOBS_ITEM,
  MORE_TAB,
  ORDERS_ITEM,
  PRODUCTION_ITEM,
  PRODUCTS_ITEM,
  PROFILE_ITEM,
  PURCHASING_ITEM,
  SALES_ITEM,
  SCRAP_ITEM,
  SETTINGS_ITEM,
  WAREHOUSE_ITEM,
  isNavItemActive,
  type NavLeaf,
} from "@core/shared/nav";
import { resolveBackHref } from "@core/shared/back-nav";

const CONTEXT_LEAVES: NavLeaf[] = [
  HOME_ITEM,
  SALES_ITEM,
  CRM_ITEM,
  ORDERS_ITEM,
  PRODUCTS_ITEM,
  PRODUCTION_ITEM,
  WAREHOUSE_ITEM,
  PURCHASING_ITEM,
  FINANCE_ITEM,
  EMPLOYEES_ITEM,
  APPROVALS_ITEM,
  ANALYTICS_ITEM,
  SETTINGS_ITEM,
  HELP_ITEM,
  COMMISSION_ITEM,
  BATCHES_ITEM,
  SCRAP_ITEM,
  INVENTORY_ITEM,
  EXPENSES_ITEM,
  JOBS_ITEM,
  HISTORY_ITEM,
  PROFILE_ITEM,
  MORE_TAB,
  {
    id: "notifications",
    href: "/notifications",
    labelKey: "nav.notifications",
    permission: null,
    icon: "notifications",
  },
  { id: "search", href: "/search", labelKey: "search.title", permission: null, icon: "search" },
];

export function shellPageContext(path: string): NavLeaf | null {
  const hits = CONTEXT_LEAVES.filter((item) => isNavItemActive(path, item.href));
  if (hits.length === 0) return null;
  return hits.reduce((best, item) => (item.href.length >= best.href.length ? item : best));
}

/** True when the shell should show a back control (same parent rules as resolveBackHref). */
export function isNestedShellPath(path: string): boolean {
  return resolveBackHref(path) !== null;
}
