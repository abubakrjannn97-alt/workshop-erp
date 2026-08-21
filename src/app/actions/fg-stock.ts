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
import { D, qtyDisplay } from "@core/shared/decimal";

/** Worker / production: put finished goods onto FG warehouse (make-to-stock). */
export async function stockFinishedGoods(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const parsed = z
    .object({
      productId: z.string().min(1),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      comment: z.string().optional(),
    })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const qty = D(parsed.data.quantity);
  if (!qty.gt(0)) return { error: "Укажите количество больше 0." };

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, archivedAt: null, isActive: true },
    include: { saleUnit: true },
  });
  if (!product) return { error: "Изделие не найдено." };

  const fg = await getFgWarehouse();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  try {
    await receiveProduct({
      warehouseId: fg.id,
      productId: product.id,
      quantity: parsed.data.quantity,
      unitCost: "0",
      userId: session.user.id,
      comment: parsed.data.comment?.trim() || `Выпуск на склад ГП · ${session.user.name}`,
      idempotencyKey,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось добавить на склад ГП." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "stock.fg_production",
    entityType: "product",
    entityId: product.id,
    newValue: { quantity: parsed.data.quantity, warehouseId: fg.id },
  });

  await notifyRoles(["owner", "director", "sales_manager", "warehouse_manager"], {
    type: "stock",
    title: "Пополнение склада ГП",
    body: `${product.name}: +${qtyDisplay(parsed.data.quantity)} ${product.saleUnit.symbol}`,
    entityType: "product",
    entityId: product.id,
  });

  revalidatePath("/me");
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  revalidatePath("/");
  return { ok: true };
}
