import type { DashQuickActionIconId } from "@/components/dashboard/dash-quick-action-icons";
import type { PermissionCode } from "@core/rbac/permissions";
import { hasPermission } from "@core/rbac/permissions";

type MobileMenuActionDef = {
  href: string;
  labelKey: string;
  icon: DashQuickActionIconId;
  permission?: PermissionCode | null;
};

const OWNER_ACTIONS: MobileMenuActionDef[] = [
  { href: "/orders/new", labelKey: "sales.newOrder", icon: "plus", permission: "orders.create" },
  { href: "/production", labelKey: "home.actionStartProduction", icon: "play", permission: "production.view" },
  { href: "/warehouse", labelKey: "home.actionToWarehouse", icon: "truck", permission: "inventory.view" },
  { href: "/analytics", labelKey: "home.actionDailyReport", icon: "chart-column", permission: "analytics.view" },
];

const SALES_ACTIONS: MobileMenuActionDef[] = [
  { href: "/orders/new", labelKey: "sales.newOrder", icon: "plus", permission: "orders.create" },
  { href: "/crm", labelKey: "nav.crm", icon: "users", permission: "crm.view" },
  { href: "/orders", labelKey: "nav.orders", icon: "clipboard-list", permission: "orders.view" },
];

const PRODUCTION_ACTIONS: MobileMenuActionDef[] = [
  { href: "/production", labelKey: "nav.production", icon: "factory", permission: "production.view" },
  { href: "/production/batches", labelKey: "nav.batches", icon: "box", permission: "production.view" },
];

const WAREHOUSE_ACTIONS: MobileMenuActionDef[] = [
  { href: "/warehouse", labelKey: "nav.warehouse", icon: "package", permission: "inventory.view" },
  { href: "/purchasing", labelKey: "nav.purchasing", icon: "truck", permission: "purchasing.view" },
];

const ACCOUNTANT_ACTIONS: MobileMenuActionDef[] = [
  { href: "/finance", labelKey: "nav.finance", icon: "chart-column", permission: "finance.view" },
  { href: "/finance/expenses", labelKey: "nav.expenses", icon: "clipboard-list", permission: "finance.view" },
];

const WORKER_ACTIONS: MobileMenuActionDef[] = [
  { href: "/me", labelKey: "nav.myJobs", icon: "play", permission: null },
  { href: "/me/history", labelKey: "nav.history", icon: "clipboard-list", permission: null },
];

function actionsForRole(roleCode: string): MobileMenuActionDef[] {
  switch (roleCode) {
    case "sales_manager":
      return SALES_ACTIONS;
    case "production_manager":
      return PRODUCTION_ACTIONS;
    case "warehouse_manager":
      return WAREHOUSE_ACTIONS;
    case "accountant":
      return ACCOUNTANT_ACTIONS;
    case "worker":
      return WORKER_ACTIONS;
    default:
      return OWNER_ACTIONS;
  }
}

export type MobileMenuQuickAction = {
  href: string;
  label: string;
  icon: DashQuickActionIconId;
};

export function mobileMenuQuickActions(
  roleCode: string,
  permissions: string[],
  t: (key: string) => string,
  max = 4,
): MobileMenuQuickAction[] {
  return actionsForRole(roleCode)
    .filter((action) => !action.permission || hasPermission(permissions, roleCode, action.permission))
    .slice(0, max)
    .map((action) => ({
      href: action.href,
      label: t(action.labelKey),
      icon: action.icon,
    }));
}
