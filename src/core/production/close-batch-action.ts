"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { MOVEMENT, receiveProduct, releaseMaterial, writeOffMaterial } from "@/lib/stock";
import { ORDER_STATUS } from "@/lib/orders";
import { accrueProductionWage } from "@/lib/payroll";
import { notifyRoles } from "@core/control/control";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "@/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCode } from "@/lib/domain-config";
import { resolveProductionProductId } from "@core/production/production-order";

function qtyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,6})?$/).safeParse(value).success;
}

/** Close a production batch from form data. Shared by app actions and offline sync. */
export async function closeBatch(formData: FormData) {
  const session = await requirePermission("production.report");
  const batchId = String(formData.get("batchId") ?? "");
  const actualQty = String(formData.get("actualQty") ?? "");
  const scrapQty = String(formData.get("scrapQty") ?? "0") || "0";
  const scrapReason = String(formData.get("scrapReason") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  if (!qtyStr(actualQty) || D(actualQty).lt(0)) return { error: "Фактический выпуск." };
  if (!qtyStr(scrapQty) || D(scrapQty).lt(0)) return { error: "Брак." };
  if (D(scrapQty).gt(0) && !scrapReason) return { error: "Укажите причину брака." };

  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      materials: { include: { material: true } },
      production: { include: { order: { include: { items: true, materials: true } } } },
    },
  });
  if (!batch) return { error: "Партия закрыта или не найдена." };
  if (batch.status === "CLOSED") return { ok: true };

  const actuals = batch.materials.map((line) => {
    const raw = String(formData.get(`actual-${line.materialId}`) ?? "") || String(line.plannedQty);
    return { line, actual: raw };
  });
  for (const row of actuals) {
    if (!qtyStr(row.actual) || D(row.actual).lt(0)) return { error: "Проверьте фактический расход сырья." };
  }

  const rawWh = await findRawWarehouse();
  const fg = await findFinishedGoodsWarehouse();
  if (!rawWh || !fg) return { error: "Склады RAW/FG не найдены." };
  const productId = resolveProductionProductId(batch.production.order.items);
  if (!productId) {
    const hasItems = batch.production.order.items.length > 0;
    return {
      error: hasItems
        ? "Заказ содержит несколько разных изделий. Производство поддерживает одно изделие на заказ."
        : "В заказе нет изделия.",
    };
  }

  const materialCost = actuals.reduce((s, row) => {
    const unit = row.line.material.averagePurchasePrice ?? row.line.material.lastPurchasePrice;
    if (!unit) return s;
    return s.add(D(row.actual).mul(unit));
  }, D(0));
  const good = D(actualQty);
  const unitCost = good.gt(0) ? materialCost.div(good) : D(0);
  const productionSchemeCode = await resolveProductionPaySchemeCode();

  try {
    let closedNow = false;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM production_batches WHERE id = ${batchId} FOR UPDATE`;
      const locked = await tx.productionBatch.findUnique({ where: { id: batchId } });
      if (!locked || locked.status === "CLOSED") return;
      closedNow = true;
      for (const row of actuals) {
        if (D(row.actual).lte(0)) {
          await tx.batchMaterialUse.update({ where: { id: row.line.id }, data: { actualQty: "0" } });
          continue;
        }
        await writeOffMaterial(
          {
            warehouseId: rawWh.id,
            materialId: row.line.materialId,
            quantity: qty(row.actual),
            userId: session.user.id,
            type: MOVEMENT.ISSUE,
            reason: `Партия №${batch.number}`,
            consumeReserved: true,
            relatedType: "production_batch",
            relatedId: batch.id,
            idempotencyKey: `batch-issue-${batch.id}-${row.line.materialId}`,
          },
          tx,
        );
        await tx.batchMaterialUse.update({
          where: { id: row.line.id },
          data: { actualQty: row.actual },
        });
      }

      if (good.gt(0)) {
        await receiveProduct(
          {
            warehouseId: fg.id,
            productId,
            quantity: qty(good),
            unitCost: qty(unitCost),
            userId: session.user.id,
            comment: `Выпуск партии №${batch.number}`,
            relatedType: "production_batch",
            relatedId: batch.id,
            idempotencyKey: `batch-fg-${batch.id}`,
          },
          tx,
        );
      }

      if (D(scrapQty).gt(0)) {
        const scrapShare = D(actualQty).add(scrapQty).gt(0)
          ? D(scrapQty).div(D(actualQty).add(scrapQty))
          : D(0);
        await tx.scrapRecord.create({
          data: {
            batchId: batch.id,
            quantity: scrapQty,
            reason: scrapReason,
            userId: session.user.id,
            photoUrl: photoUrl || null,
            materialCost: money(materialCost.mul(scrapShare)),
          },
        });
      }

      await tx.productionBatch.update({
        where: { id: batch.id },
        data: {
          status: "CLOSED",
          actualQty,
          scrapQty,
          producedAt: new Date(),
          comment: comment || batch.comment,
          photoUrl: photoUrl || batch.photoUrl,
        },
      });

      if (batch.responsibleUserId && good.gt(0)) {
        const worker = await tx.user.findUnique({
          where: { id: batch.responsibleUserId },
          include: { payScheme: true },
        });
        const rate =
          worker?.payScheme?.productionRate ??
          (await tx.payScheme.findUnique({ where: { code: productionSchemeCode } }))?.productionRate;
        if (rate) {
          await accrueProductionWage(tx, {
            userId: batch.responsibleUserId,
            batchId: batch.id,
            orderId: batch.production.orderId,
            goodQty: qty(good),
            rate: String(rate),
          });
        }
      }

      const all = await tx.productionBatch.findMany({ where: { productionOrderId: batch.productionOrderId } });
      const produced = all.reduce((s, b) => s.add(String(b.actualQty)), D(0));
      const scrap = all.reduce((s, b) => s.add(String(b.scrapQty)), D(0));
      const allClosed = all.every((b) => b.status === "CLOSED");
      await tx.productionOrder.update({
        where: { id: batch.productionOrderId },
        data: {
          producedQty: qty(produced),
          scrapQty: qty(scrap),
          status: allClosed ? "DONE" : "IN_PROGRESS",
        },
      });

      if (allClosed) {
        const raw = await findRawWarehouse(tx);
        if (raw) {
          const uses = await tx.batchMaterialUse.findMany({
            where: { batch: { productionOrderId: batch.productionOrderId } },
          });
          const issued = new Map<string, ReturnType<typeof D>>();
          for (const use of uses) {
            issued.set(use.materialId, (issued.get(use.materialId) ?? D(0)).add(String(use.actualQty)));
          }
          for (const need of batch.production.order.materials) {
            const left = D(String(need.reservedQty)).sub(issued.get(need.materialId) ?? D(0));
            if (left.lte(0)) continue;
            await releaseMaterial(
              {
                warehouseId: raw.id,
                materialId: need.materialId,
                quantity: qty(left),
                userId: session.user.id,
                relatedType: "production_order",
                relatedId: batch.productionOrderId,
                idempotencyKey: `prod-release-${batch.productionOrderId}-${need.materialId}`,
              },
              tx,
            );
            await tx.orderMaterialNeed.update({
              where: { id: need.id },
              data: { reservedQty: qty(D(String(need.reservedQty)).sub(left)) },
            });
          }
        }
        const nextCode = produced.gte(batch.production.plannedQty) ? ORDER_STATUS.IN_FG : ORDER_STATUS.PARTIAL;
        const next = await tx.orderStatus.findUnique({ where: { code: nextCode } });
        if (next) {
          await tx.order.update({
            where: { id: batch.production.orderId },
            data: { statusId: next.id },
          });
        }
      }
    });
    if (!closedNow) return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось закрыть партию." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "production.batch.close",
    entityType: "production_batch",
    entityId: batch.id,
    newValue: { actualQty, scrapQty },
  });
  const over = actuals.filter((row) => {
    const plan = D(String(row.line.plannedQty));
    if (plan.lte(0)) return false;
    return D(row.actual).sub(plan).div(plan).mul(100).gte(5);
  });
  if (over.length > 0) {
    await notifyRoles(["owner", "director"], {
      type: "overuse",
      title: "Перерасход сырья",
      body: `Партия №${batch.number}, заказ #${batch.production.order.number}: расход выше нормы.`,
      entityType: "production_batch",
      entityId: batch.id,
    });
  }
  if (D(scrapQty).gt(0)) {
    await notifyRoles(["owner", "director", "production_manager"], {
      type: "scrap",
      title: "Брак",
      body: `Партия №${batch.number}: брак ${scrapQty}. ${scrapReason}`,
      entityType: "production_batch",
      entityId: batch.id,
    });
  }

  revalidatePath("/production");
  revalidatePath(`/production/${batch.productionOrderId}`);
  revalidatePath("/production/batches");
  revalidatePath("/production/scrap");
  revalidatePath("/me");
  revalidatePath("/me/history");
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  return { ok: true };
}
