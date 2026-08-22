"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { receiveProduct } from "@core/inventory/stock";
import { getFgWarehouse } from "@core/config/resolve-warehouse";
import { notifyRoles } from "@core/control/control";
import { D, money, qty, qtyDisplay } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";
import { getProductLaborRate } from "@core/payroll/product-labor-rate-db";
import { periodKey } from "@core/payroll/payroll";

/** Worker / production: put finished goods onto FG warehouse (make-to-stock). */
export async function stockFinishedGoods(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const parsed = z
    .object({
      productId: z.string().min(1),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      scrapQty: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
      comment: z.string().optional(),
    })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      scrapQty: String(formData.get("scrapQty") ?? "0").trim() || "0",
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const qtyVal = D(parsed.data.quantity);
  if (!qtyVal.gt(0)) return { error: "Укажите количество больше 0." };

  const scrapVal = D(parsed.data.scrapQty ?? "0");
  if (scrapVal.lt(0)) return { error: "Брак не может быть отрицательным." };

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, archivedAt: null, isActive: true },
    include: { saleUnit: true },
  });
  if (!product) return { error: "Изделие не найдено." };

  const fg = await getFgWarehouse();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());
  const rate = productLaborRate(await getProductLaborRate(product.id));
  const scrapNote = scrapVal.gt(0) ? ` · брак ${qtyDisplay(parsed.data.scrapQty!)} ${product.saleUnit.symbol}` : "";
  const baseComment = parsed.data.comment?.trim() || `Выпуск · ${session.user.name}`;

  try {
    await prisma.$transaction(async (tx) => {
      await receiveProduct(
        {
          warehouseId: fg.id,
          productId: product.id,
          quantity: parsed.data.quantity,
          unitCost: "0",
          userId: session.user.id,
          comment: baseComment,
          idempotencyKey,
        },
        tx,
      );

      await tx.payrollAccrual.create({
        data: {
          userId: session.user.id,
          kind: "PRODUCTION",
          amount: money(qtyVal.mul(rate)),
          quantity: qty(parsed.data.quantity),
          productId: product.id,
          periodKey: periodKey(),
          status: "ACCRUED",
          comment: `${product.name}: ${qtyDisplay(parsed.data.quantity)} ${product.saleUnit.symbol} × ${rate} с/ед.${scrapNote}`,
        },
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось добавить на склад ГП." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "stock.fg_production",
    entityType: "product",
    entityId: product.id,
    newValue: {
      quantity: parsed.data.quantity,
      scrapQty: parsed.data.scrapQty ?? "0",
      warehouseId: fg.id,
    },
  });

  await notifyRoles(["owner", "director", "sales_manager", "warehouse_manager"], {
    type: "stock",
    title: "Пополнение склада ГП",
    body: `${product.name}: +${qtyDisplay(parsed.data.quantity)} ${product.saleUnit.symbol}${scrapNote} · ${session.user.name}`,
    entityType: "product",
    entityId: product.id,
  });

  revalidatePath("/me");
  revalidatePath("/me/stats");
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  revalidatePath("/");
  return { ok: true };
}
