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

function scopeWhere(model: string, where: Record<string, unknown> | undefined, workshopId: string) {
  if (model === "Setting") {
    if (where && "key" in where && !("workshopId_key" in where) && !("workshopId" in where)) {
      return { workshopId_key: { workshopId, key: where.key as string } };
    }
    return { ...(where ?? {}), workshopId };
  }

  if (where && "code" in where && !("workshopId" in where) && CODE_UNIQUE_MODELS.has(model)) {
    return { workshopId_code: { workshopId, code: where.code as string } };
  }

  if (where && "number" in where && !("workshopId" in where) && NUMBER_UNIQUE_MODELS.has(model)) {
    return { workshopId_number: { workshopId, number: where.number as number | string } };
  }

  if (where && "year" in where && "month" in where && model === "AccountingPeriod" && !("workshopId" in where)) {
    return {
      workshopId_year_month: {
        workshopId,
        year: where.year as number,
        month: where.month as number,
      },
    };
  }

  return { ...(where ?? {}), workshopId };
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
