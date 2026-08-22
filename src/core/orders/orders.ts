import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { D, money, qty } from "@core/shared/decimal";
import { materialCostForRecipe, scaleNeed } from "@core/costing/costing";
import { SETTING_KEYS } from "@core/config/settings";
import { findSetting } from "@core/config/setting-store";

export {
  LOST_REASONS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  STATUS_FLOW,
} from "./order-constants";

export function paymentStatusOf(total: { toString(): string }, paid: { toString(): string }, hadRefund: boolean) {
  const t = D(String(total));
  const p = D(String(paid));
  if (hadRefund && p.lte(0)) return "refund";
  if (p.lte(0)) return "unpaid";
  if (p.lt(t)) return "partial";
  if (p.eq(t)) return "paid";
  return "overpaid";
}

export async function nextOrderNumber(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const last = await tx.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return last ? last.number + 1 : 1001;
}

export async function discountLimitPercent() {
  const row = await findSetting(SETTING_KEYS.discountLimitPercent);
  const raw = row?.value;
  const value = typeof raw === "string" ? raw : raw == null ? "5" : String(raw);
  return D(value.replace(/"/g, "") || "5");
}

export type QuoteLine = {
  materialId: string;
  materialName: string;
  plannedQty: string;
  unitCost: string | null;
  lineCost: string | null;
  storageSymbol: string;
};

export type OrderQuote = {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  outputQty: string;
  outputSymbol: string;
  saleSymbol: string;
  recipeVersionId: string | null;
  recipeVersionNumber: number | null;
  materialCost: string | null;
  materials: QuoteLine[];
};

export async function quoteProduct(productId: string, quantity: string, unitPrice?: string): Promise<OrderQuote> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      saleUnit: true,
      outputUnit: true,
      prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 },
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: {
              items: { include: { material: { include: { storageUnit: true } }, unit: true } },
            },
            take: 1,
          },
        },
      },
    },
  });
  if (!product || product.archivedAt) throw new Error("Изделие не найдено.");
  const qtyOrder = D(quantity);
  if (qtyOrder.lte(0)) throw new Error("Количество должно быть больше нуля.");
  const price = unitPrice !== undefined ? D(unitPrice) : D(String(product.prices[0]?.price ?? 0));
  const scale = scaleNeed(product.recipeBaseQty, qtyOrder);
  const version = product.recipe?.versions[0];
  const cost = version ? materialCostForRecipe(version.items, scale) : null;
  return {
    productId: product.id,
    productName: product.name,
    quantity: qty(qtyOrder),
    unitPrice: money(price),
    amount: money(qtyOrder.mul(price)),
    outputQty: qty(D(String(product.outputPerBase)).mul(scale)),
    outputSymbol: product.outputUnit.symbol,
    saleSymbol: product.saleUnit.symbol,
    recipeVersionId: version?.id ?? null,
    recipeVersionNumber: version?.versionNumber ?? null,
    materialCost: cost?.total ?? null,
    materials: (cost?.lines ?? []).map((line) => ({
      materialId: line.materialId,
      materialName: line.materialName,
      plannedQty: line.quantityInStorage,
      unitCost: line.unitPrice,
      lineCost: line.lineCost,
      storageSymbol: line.storageSymbol,
    })),
  };
}

export function mergeMaterialNeeds(quotes: OrderQuote[]) {
  const map = new Map<string, QuoteLine>();
  for (const quote of quotes) {
    for (const line of quote.materials) {
      const prev = map.get(line.materialId);
      if (!prev) {
        map.set(line.materialId, { ...line });
        continue;
      }
      const qtySum = D(prev.plannedQty).add(line.plannedQty);
      const costSum =
        prev.lineCost && line.lineCost ? D(prev.lineCost).add(line.lineCost) : prev.lineCost || line.lineCost;
      map.set(line.materialId, {
        ...prev,
        plannedQty: qty(qtySum),
        lineCost: costSum ? money(costSum) : null,
      });
    }
  }
  return [...map.values()];
}
