export const NOTIF_CATEGORIES = [
  "all",
  "warehouse",
  "debts",
  "orders",
  "production",
  "approvals",
  "other",
] as const;

export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

const TYPE_TO_CATEGORY: Record<string, Exclude<NotifCategory, "all">> = {
  low_stock: "warehouse",
  inventory_shortage: "warehouse",
  unpaid: "debts",
  supplier_debt: "debts",
  overdue: "orders",
  scrap: "production",
  overuse: "production",
  approval: "approvals",
};

export function notificationCategory(type: string): Exclude<NotifCategory, "all"> {
  return TYPE_TO_CATEGORY[type] ?? "other";
}

export function resolveNotifCategory(raw?: string | null): NotifCategory {
  if (raw && (NOTIF_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as NotifCategory;
  }
  return "all";
}

export function notificationHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null;
  if (entityType === "approval") return "/settings/approvals";
  if (entityType === "order" && entityId) return `/orders/${entityId}`;
  if (entityType === "purchase_order") return "/finance";
  if (entityType === "material") return "/warehouse";
  if (entityType === "inventory_count") return "/warehouse/inventory";
  if (entityType === "production_batch" && entityId) return `/production/batches`;
  if (entityType === "product" && entityId) return `/products/${entityId}`;
  if (entityType === "cash_shift") return "/finance";
  return null;
}
