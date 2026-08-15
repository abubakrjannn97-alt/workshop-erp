import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/decimal";
import { notifyRoles } from "@/lib/control";
import { available } from "@/lib/stock";

async function alreadyToday(type: string, entityId: string) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return prisma.notification.findFirst({
    where: { type, entityId, createdAt: { gte: from } },
  });
}

export async function refreshOwnerAlerts() {
  const [low, overdue, unpaid, purchases] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true },
      take: 30,
    }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      take: 30,
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
    }),
  ]);

  for (const m of low) {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    if (onHand.gt(m.minStock)) continue;
    if (await alreadyToday("low_stock", m.id)) continue;
    await notifyRoles(["owner", "director", "warehouse_manager"], {
      type: "low_stock",
      title: "Низкий остаток",
      body: `${m.name}: ${onHand.toFixed(3)} ${m.storageUnit.symbol}, минимум ${String(m.minStock)}`,
      entityType: "material",
      entityId: m.id,
    });
  }

  for (const o of overdue) {
    if (await alreadyToday("overdue", o.id)) continue;
    await notifyRoles(["owner", "director", "sales_manager"], {
      type: "overdue",
      title: "Просроченный заказ",
      body: o.customer.name,
      entityType: "order",
      entityId: o.id,
    });
  }

  for (const o of unpaid) {
    const debt = D(String(o.total)).sub(o.paidAmount);
    if (debt.lte(0)) continue;
    if (await alreadyToday("unpaid", o.id)) continue;
    await notifyRoles(["owner", "director", "sales_manager"], {
      type: "unpaid",
      title: "Неоплаченный заказ / долг клиента",
      body: `${o.customer.name}: ${debt.toFixed(2)} с`,
      entityType: "order",
      entityId: o.id,
    });
  }

  for (const po of purchases) {
    const debt = D(String(po.total)).sub(po.paidAmount);
    if (debt.lte(0)) continue;
    if (await alreadyToday("supplier_debt", po.id)) continue;
    await notifyRoles(["owner", "director", "accountant"], {
      type: "supplier_debt",
      title: "Долг поставщику",
      body: `${po.number} ${po.supplier.name}: ${debt.toFixed(2)} с`,
      entityType: "purchase_order",
      entityId: po.id,
    });
  }
}

export async function coverageAndPurchaseNeed() {
  const raw = await prisma.warehouse.findUnique({ where: { code: "RAW" } });
  const product = await prisma.product.findFirst({
    where: { archivedAt: null, isActive: true },
    include: {
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: { items: true },
            take: 1,
          },
        },
      },
    },
  });
  const version = product?.recipe?.versions[0];
  let coverQty: string | null = null;
  if (raw && version && product) {
    const base = D(String(product.recipeBaseQty || 1));
    let minCover = D("Infinity");
    for (const item of version.items) {
      const stock = await prisma.stockItem.findUnique({
        where: { warehouseId_materialId: { warehouseId: raw.id, materialId: item.materialId } },
      });
      const avail = stock ? available(stock.qtyOnHand, stock.qtyReserved) : D(0);
      const perBase = D(String(item.quantity));
      if (perBase.lte(0)) continue;
      const cover = avail.div(perBase).mul(base);
      if (cover.lt(minCover)) minCover = cover;
    }
    coverQty = minCover.isFinite() ? minCover.toFixed(3) : "0";
  }

  const needs = await prisma.orderMaterialNeed.findMany({
    where: { order: { status: { code: { notIn: ["CANCELLED", "COMPLETED"] } } } },
    include: { material: { include: { storageUnit: true } } },
  });
  const buyMap = new Map<string, { name: string; qty: ReturnType<typeof D>; symbol: string }>();
  for (const n of needs) {
    const short = D(String(n.plannedQty)).sub(n.reservedQty);
    if (short.lte(0)) continue;
    const prev = buyMap.get(n.materialId);
    if (!prev) {
      buyMap.set(n.materialId, {
        name: n.material.name,
        qty: short,
        symbol: n.material.storageUnit.symbol,
      });
    } else {
      prev.qty = prev.qty.add(short);
    }
  }

  return {
    coverQty,
    coverUnit: product?.saleUnitId ? "ед. продажи" : "м²",
    productName: product?.name ?? null,
    purchaseNeed: [...buyMap.values()].map((r) => ({
      name: r.name,
      qty: r.qty.toFixed(3),
      symbol: r.symbol,
    })),
  };
}

const refreshOwnerAlertsThrottled = unstable_cache(
  async () => {
    await refreshOwnerAlerts();
    return true;
  },
  ["refresh-owner-alerts"],
  { revalidate: 300 },
);

/** Refreshes alert notifications without blocking the page on DB pressure. */
export async function maybeRefreshOwnerAlerts() {
  try {
    await refreshOwnerAlertsThrottled();
  } catch (error) {
    console.error("refreshOwnerAlerts failed:", error);
  }
}
