"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { D, qty } from "@core/shared/decimal";
import { ORDER_STATUS } from "@/lib/orders";

function qtyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,6})?$/).safeParse(value).success;
}

export async function createBatch(formData: FormData) {
  const session = await requirePermission("production.manage");
  const productionOrderId = String(formData.get("productionOrderId") ?? "");
  const plannedQty = String(formData.get("plannedQty") ?? "");
  const responsibleUserId = String(formData.get("responsibleUserId") ?? "") || null;
  const comment = String(formData.get("comment") ?? "").trim();
  if (!qtyStr(plannedQty) || D(plannedQty).lte(0)) return { error: "Укажите план партии." };

  const po = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { order: { include: { materials: true, items: true } }, batches: true },
  });
  if (!po || po.status === "DONE") return { error: "Производственный заказ недоступен." };

  const already = po.batches.reduce((s, b) => s.add(String(b.plannedQty)), D(0));
  const remaining = D(String(po.plannedQty)).sub(already);
  if (D(plannedQty).gt(remaining)) {
    return { error: `План больше остатка (${qty(remaining)}).` };
  }

  const scale = D(String(po.plannedQty)).gt(0) ? D(plannedQty).div(po.plannedQty) : D(0);
  const last = po.batches.reduce((n, b) => Math.max(n, b.number), 0);

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.productionBatch.create({
      data: {
        productionOrderId,
        number: last + 1,
        status: "OPEN",
        plannedQty,
        responsibleUserId,
        comment: comment || null,
        materials: {
          create: po.order.materials.map((need) => ({
            materialId: need.materialId,
            plannedQty: qty(D(String(need.plannedQty)).mul(scale)),
          })),
        },
      },
    });
    const inProd = await tx.orderStatus.findUnique({ where: { code: ORDER_STATUS.IN_PRODUCTION } });
    if (inProd) {
      await tx.order.update({ where: { id: po.orderId }, data: { statusId: inProd.id } });
    }
    await tx.productionOrder.update({ where: { id: productionOrderId }, data: { status: "IN_PROGRESS" } });
    return created;
  });

  await writeAudit({
    userId: session.user.id,
    action: "production.batch.create",
    entityType: "production_batch",
    entityId: batch.id,
    newValue: { number: batch.number, plannedQty },
  });
  revalidatePath("/production");
  revalidatePath(`/production/${po.id}`);
  revalidatePath(`/orders/${po.orderId}`);
  return { ok: true, id: batch.id };
}

export { closeBatch } from "@/core/production/close-batch-action";
