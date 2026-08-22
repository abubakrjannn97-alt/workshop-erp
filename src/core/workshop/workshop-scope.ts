import { getWorkshopIdFromContext } from "./workshop-storage";

/** Models with a direct workshopId column — auto-scoped by Prisma extension. */
export const WORKSHOP_SCOPED_MODELS = new Set([
  "Material",
  "Product",
  "Warehouse",
  "Supplier",
  "PurchaseOrder",
  "Customer",
  "LeadStage",
  "Lead",
  "OrderStatus",
  "Order",
  "ProductionStage",
  "ProductionOrder",
  "CashAccount",
  "FinancialFund",
  "ExpenseCategory",
  "LedgerEntry",
  "Obligation",
  "PayScheme",
  "PayrollAccrual",
  "PayrollPayout",
  "Notification",
  "ApprovalRequest",
  "CashShift",
  "AccountingPeriod",
  "Setting",
  "StockItem",
  "StockMovement",
  "InventoryCount",
  "PurchasePayment",
  "CrmDocument",
  "Payment",
  "ProductionBatch",
  "ScrapRecord",
]);

/** Composite unique: workshopId + code */
const CODE_UNIQUE_MODELS = new Set([
  "Warehouse",
  "LeadStage",
  "OrderStatus",
  "CashAccount",
  "FinancialFund",
  "ExpenseCategory",
  "PayScheme",
  "ProductionStage",
]);

const NUMBER_UNIQUE_MODELS = new Set(["Order", "PurchaseOrder"]);

const READ_OPS = new Set(["findMany", "findFirst", "count", "aggregate", "groupBy"]);
const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

function hasCompoundWorkshopUnique(where: Record<string, unknown>) {
  return Object.keys(where).some((key) => key.startsWith("workshopId_"));
}

function scopeWhere(model: string, where: Record<string, unknown> | undefined, workshopId: string) {
  const w = where ?? {};

  if (hasCompoundWorkshopUnique(w)) {
    return w;
  }

  // findUnique by primary key — extra workshopId breaks Prisma unique selectors.
  if ("id" in w && Object.keys(w).length === 1) {
    return w;
  }

  if (model === "Setting") {
    if ("key" in w && typeof w.key === "string") {
      return { workshopId_key: { workshopId, key: w.key } };
    }
    return { ...w, workshopId };
  }

  if ("code" in w && typeof w.code === "string" && CODE_UNIQUE_MODELS.has(model)) {
    return { workshopId_code: { workshopId, code: w.code } };
  }

  if ("number" in w && NUMBER_UNIQUE_MODELS.has(model)) {
    return { workshopId_number: { workshopId, number: w.number as number | string } };
  }

  if ("year_month" in w && model === "AccountingPeriod") {
    const ym = w.year_month as { year: number; month: number };
    return { workshopId_year_month: { workshopId, year: ym.year, month: ym.month } };
  }

  if ("year" in w && "month" in w && model === "AccountingPeriod") {
    return {
      workshopId_year_month: {
        workshopId,
        year: w.year as number,
        month: w.month as number,
      },
    };
  }

  if ("workshopId" in w) {
    return w;
  }

  return { ...w, workshopId };
}

export function scopeQueryArgs(model: string, operation: string, args: Record<string, unknown>, workshopId: string) {
  if (!WORKSHOP_SCOPED_MODELS.has(model)) return args;

  const next = { ...args };

  if (READ_OPS.has(operation) || operation === "findUnique") {
    next.where = scopeWhere(model, next.where as Record<string, unknown> | undefined, workshopId);
  }

  if (operation === "create") {
    next.data = { ...(next.data as object), workshopId };
  }

  if (operation === "createMany") {
    const data = next.data;
    if (Array.isArray(data)) {
      next.data = data.map((row) => ({ ...row, workshopId }));
    } else if (data && typeof data === "object") {
      next.data = { ...data, workshopId };
    }
  }

  if (operation === "upsert") {
    next.where = scopeWhere(model, next.where as Record<string, unknown> | undefined, workshopId);
    next.create = { ...(next.create as object), workshopId };
  }

  if (operation === "update" || operation === "updateMany" || operation === "delete" || operation === "deleteMany") {
    next.where = scopeWhere(model, next.where as Record<string, unknown> | undefined, workshopId);
  }

  return next;
}

export function getScopedWorkshopId(): string | undefined {
  return getWorkshopIdFromContext();
}
