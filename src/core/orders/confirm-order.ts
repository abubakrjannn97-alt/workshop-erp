import { prisma } from "@core/infrastructure/prisma";
import { D, qty } from "@core/shared/decimal";
import { reserveMaterial } from "@core/inventory/stock";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";
import { pendingFor } from "@core/control/control";
import { writeAudit } from "@core/control/audit";
import { ORDER_STATUS } from "@core/orders/orders";

export async function confirmOrderCore(
  orderId: string,
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { status: true, materials: true, items: true, production: true },
  });
  if (!order) return { error: "Заказ не найден." };
  if (order.status.code !== ORDER_STATUS.NEW && order.status.code !== ORDER_STATUS.AWAITING_PAYMENT) {
    return { ok: true };
  }
  if (await pendingFor("order", orderId, "DISCOUNT")) {
    return { error: "Скидка на согласовании у руководителя." };
  }

  const raw = await findRawWarehouse();
  if (!raw) return { error: "Склад сырья не найден." };
  const confirmed = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CONFIRMED } });

  try {
    await prisma.$transaction(async (tx) => {
      let canProduceFully = true;
      for (const need of order.materials) {
        const result = await reserveMaterial(
          {
            warehouseId: raw.id,
            materialId: need.materialId,
            quantity: qty(need.plannedQty),
            userId,
            relatedType: "order",
            relatedId: order.id,
            idempotencyKey: `order-reserve-${order.id}-${need.materialId}`,
            partial: true,
          },
          tx,
        );
        if (D(result.shortage).gt(0)) canProduceFully = false;
        await tx.orderMaterialNeed.update({
          where: { id: need.id },
          data: { reservedQty: result.reserved },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          statusId: confirmed.id,
          confirmedAt: new Date(),
          canProduceFully,
        },
      });
      if (!order.production) {
        const plannedQty = order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
        await tx.productionOrder.create({
          data: {
            orderId: order.id,
            status: "OPEN",
            plannedQty: qty(plannedQty),
            dueAt: order.dueAt,
          },
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось подтвердить." };
  }

  await writeAudit({
    userId,
    action: "order.confirm",
    entityType: "order",
    entityId: orderId,
  });
  return { ok: true };
}
