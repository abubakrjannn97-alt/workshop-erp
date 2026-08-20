import type { PermissionCode } from "@core/rbac/permissions";
import { hasPermission } from "@core/rbac/permissions";

export type NavIcon =
  | "home"
  | "sales"
  | "crm"
  | "orders"
  | "products"
  | "production"
  | "warehouse"
  | "purchasing"
  | "finance"
  | "employees"
  | "analytics"
  | "settings"
  | "help"
  | "more"
  | "commission"
  | "batches"
  | "scrap"
  | "inventory"
  | "expenses"
  | "jobs"
  | "history"
  | "profile"
  | "reports"
  | "approvals"
  | "audit"
  | "notifications"
  | "search";

export type NavLeaf = {
  id: string;
  href: string;
  labelKey: string;
  permission: PermissionCode | null;
  icon: NavIcon;
  tour?: string;
};

export type NavGroup = {
  id: string;
  labelKey: string | null;
  items: NavLeaf[];
};

export type BottomTab = NavLeaf & { isMore?: boolean };

export const HOME_ITEM: NavLeaf = {
  id: "home",
  href: "/",
  labelKey: "nav.home",
  permission: null,
  icon: "home",
  tour: "nav-home",
};

export const SALES_ITEM: NavLeaf = {
  id: "sales",
  href: "/sales",
  labelKey: "nav.salesDash",
  permission: "orders.view",
  icon: "sales",
  tour: "nav-sales",
};

export const CRM_ITEM: NavLeaf = {
  id: "crm",
  href: "/crm",
  labelKey: "nav.crm",
  permission: "crm.view",
  icon: "crm",
  tour: "nav-crm",
};

export const ORDERS_ITEM: NavLeaf = {
  id: "orders",
  href: "/orders",
  labelKey: "nav.orders",
  permission: "orders.view",
  icon: "orders",
  tour: "nav-orders",
};

export const PRODUCTS_ITEM: NavLeaf = {
  id: "products",
  href: "/products",
  labelKey: "nav.products",
  permission: "products.view",
  icon: "products",
  tour: "nav-products",
};

export const PRODUCTION_ITEM: NavLeaf = {
  id: "production",
  href: "/production",
  labelKey: "nav.production",
  permission: "production.view",
  icon: "production",
  tour: "nav-production",
};

export const WAREHOUSE_ITEM: NavLeaf = {
  id: "warehouse",
  href: "/warehouse",
  labelKey: "nav.warehouse",
  permission: "inventory.view",
  icon: "warehouse",
  tour: "nav-warehouse",
};

export const PURCHASING_ITEM: NavLeaf = {
  id: "purchasing",
  href: "/purchasing",
  labelKey: "nav.purchasing",
  permission: "purchasing.view",
  icon: "purchasing",
  tour: "nav-purchasing",
};

export const FINANCE_ITEM: NavLeaf = {
  id: "finance",
  href: "/finance",
  labelKey: "nav.finance",
  permission: "finance.view",
  icon: "finance",
  tour: "nav-finance",
};

export const EMPLOYEES_ITEM: NavLeaf = {
  id: "employees",
  href: "/employees",
  labelKey: "nav.employees",
  permission: "users.view",
  icon: "employees",
  tour: "nav-employees",
};

export const ANALYTICS_ITEM: NavLeaf = {
  id: "analytics",
  href: "/analytics",
  labelKey: "nav.analytics",
  permission: "analytics.view",
  icon: "analytics",
  tour: "nav-analytics",
};

export const SETTINGS_ITEM: NavLeaf = {
  id: "settings",
  href: "/settings",
  labelKey: "nav.settings",
  permission: "settings.view",
  icon: "settings",
  tour: "nav-settings",
};

export const APPROVALS_ITEM: NavLeaf = {
  id: "approvals",
  href: "/settings/approvals",
  labelKey: "nav.approvals",
  permission: "audit.view",
  icon: "approvals",
};

export const AUDIT_ITEM: NavLeaf = {
  id: "audit",
  href: "/settings/audit",
  labelKey: "set.audit",
  permission: "audit.view",
  icon: "audit",
};

export const HELP_ITEM: NavLeaf = {
  id: "help",
  href: "/help",
  labelKey: "nav.help",
  permission: null,
  icon: "help",
  tour: "nav-help",
};

export const COMMISSION_ITEM: NavLeaf = {
  id: "commission",
  href: "/me/commission",
  labelKey: "nav.commission",
  permission: "orders.view",
  icon: "commission",
};

export const BATCHES_ITEM: NavLeaf = {
  id: "batches",
  href: "/production/batches",
  labelKey: "nav.batches",
  permission: "production.view",
  icon: "batches",
};

export const SCRAP_ITEM: NavLeaf = {
  id: "scrap",
  href: "/production/scrap",
  labelKey: "nav.scrap",
  permission: "production.view",
  icon: "scrap",
};

export const INVENTORY_ITEM: NavLeaf = {
  id: "inventory",
  href: "/warehouse/inventory",
  labelKey: "nav.inventory",
  permission: "inventory.count",
  icon: "inventory",
};

export const EXPENSES_ITEM: NavLeaf = {
  id: "expenses",
  href: "/finance/expenses",
  labelKey: "nav.expenses",
  permission: "finance.view",
  icon: "expenses",
};

export const JOBS_ITEM: NavLeaf = {
  id: "jobs",
  href: "/me",
  labelKey: "nav.myJobs",
  permission: "production.view",
  icon: "jobs",
};

export const HISTORY_ITEM: NavLeaf = {
  id: "history",
  href: "/me/history",
  labelKey: "nav.history",
  permission: "production.view",
  icon: "history",
};

export const PROFILE_ITEM: NavLeaf = {
  id: "profile",
  href: "/me/profile",
  labelKey: "nav.profile",
  permission: null,
  icon: "profile",
};

export const MORE_TAB: BottomTab = {
  id: "more",
  href: "/more",
  labelKey: "nav.more",
  permission: null,
  icon: "more",
  isMore: true,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    labelKey: "nav.overview",
    items: [HOME_ITEM],
  },
  {
    id: "sales",
    labelKey: "nav.sales",
    items: [SALES_ITEM, CRM_ITEM, ORDERS_ITEM],
  },
  {
    id: "shop",
    labelKey: "nav.shopShort",
    items: [PRODUCTS_ITEM, PRODUCTION_ITEM, WAREHOUSE_ITEM],
  },
  {
    id: "money",
    labelKey: "nav.accounts",
    items: [EXPENSES_ITEM, PURCHASING_ITEM, FINANCE_ITEM],
  },
  {
    id: "company",
    labelKey: "nav.org",
    items: [EMPLOYEES_ITEM, APPROVALS_ITEM, ANALYTICS_ITEM, SETTINGS_ITEM, HELP_ITEM],
  },
];

const MORE_EXTRA: NavLeaf[] = [
  {
    id: "notifications",
    href: "/notifications",
    labelKey: "nav.notifications",
    permission: null,
    icon: "notifications",
  },
  { id: "search", href: "/search", labelKey: "search.title", permission: null, icon: "search" },
];

export const MORE_GROUP_IDS = ["sales", "shop", "money", "company"] as const;
export type MoreGroupId = (typeof MORE_GROUP_IDS)[number];

export function isMoreGroupId(value: string): value is MoreGroupId {
  return (MORE_GROUP_IDS as readonly string[]).includes(value);
}

export function canSee(permissions: string[], roleCode: string, item: NavLeaf) {
  return !item.permission || hasPermission(permissions, roleCode, item.permission);
}

export function sidebarGroups(permissions: string[], roleCode: string): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => canSee(permissions, roleCode, item)),
  })).filter((g) => g.items.length > 0);
}

function rawTabsForRole(roleCode: string): BottomTab[] {
  switch (roleCode) {
    case "worker":
      return [JOBS_ITEM, HISTORY_ITEM, PROFILE_ITEM];
    case "employee":
      return [
        HOME_ITEM,
        CRM_ITEM,
        ORDERS_ITEM,
        COMMISSION_ITEM,
        PRODUCTION_ITEM,
        BATCHES_ITEM,
        WAREHOUSE_ITEM,
        PURCHASING_ITEM,
        FINANCE_ITEM,
        EXPENSES_ITEM,
        JOBS_ITEM,
        HISTORY_ITEM,
        PROFILE_ITEM,
        MORE_TAB,
      ];
    case "sales_manager":
      return [HOME_ITEM, CRM_ITEM, ORDERS_ITEM, COMMISSION_ITEM, MORE_TAB];
    case "production_manager":
      return [HOME_ITEM, PRODUCTION_ITEM, BATCHES_ITEM, SCRAP_ITEM, MORE_TAB];
    case "warehouse_manager":
      return [HOME_ITEM, WAREHOUSE_ITEM, PURCHASING_ITEM, INVENTORY_ITEM, MORE_TAB];
    case "accountant":
      return [HOME_ITEM, FINANCE_ITEM, EXPENSES_ITEM, MORE_TAB];
    default:
      return [HOME_ITEM, ORDERS_ITEM, PRODUCTION_ITEM, WAREHOUSE_ITEM, MORE_TAB];
  }
}

export function bottomTabsForRole(roleCode: string, permissions: string[]): BottomTab[] {
  return rawTabsForRole(roleCode).filter((tab) => tab.isMore || canSee(permissions, roleCode, tab));
}

export function tabHrefSet(tabs: BottomTab[]): Set<string> {
  return new Set(tabs.filter((t) => !t.isMore).map((t) => t.href));
}

export function moreGroupsForRole(roleCode: string, permissions: string[]): NavGroup[] {
  const skip = tabHrefSet(bottomTabsForRole(roleCode, permissions));
  skip.add("/");
  return NAV_GROUPS.filter((g) => g.id !== "home")
    .map((g) => {
      const extras = g.id === "company" ? MORE_EXTRA : [];
      return {
        ...g,
        items: [...g.items, ...extras].filter(
          (item) => !skip.has(item.href) && canSee(permissions, roleCode, item),
        ),
      };
    })
    .filter((g) => g.items.length > 0);
}

function pathMatches(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/me") return path === "/me";
  return path === href || path.startsWith(`${href}/`);
}

export function isNavItemActive(path: string, href: string) {
  return pathMatches(path, href);
}

export function isTabActive(path: string, tab: BottomTab, tabs: BottomTab[]) {
  if (tab.isMore) {
    return !tabs.some((t) => !t.isMore && pathMatches(path, t.href));
  }
  const hits = tabs.filter((t) => !t.isMore && pathMatches(path, t.href));
  if (hits.length === 0) return false;
  const best = hits.reduce((a, b) => (a.href.length >= b.href.length ? a : b));
  return best.id === tab.id;
}

export function prefetchHrefs(roleCode: string, permissions: string[]): string[] {
  const tabs = bottomTabsForRole(roleCode, permissions);
  const more = moreGroupsForRole(roleCode, permissions);
  const hrefs = new Set<string>(tabs.map((t) => t.href));
  hrefs.add("/more");
  for (const g of more) {
    hrefs.add(`/more/${g.id}`);
    for (const item of g.items) hrefs.add(item.href);
  }
  return [...hrefs];
}
