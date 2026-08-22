"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { adjustToActual, receiveMaterial, receiveProduct, reverseMovement, transferStock, writeOffMaterial } from "@core/inventory/stock";
import { getRawWarehouse } from "@core/config/resolve-warehouse";
import { notifyRoles } from "@core/control/control";
import { canSelfApprove, queueApproval } from "@core/control/control";
import { requireWorkshopId } from "@core/workshop/workshop-context";

function key(formData: FormData) {
  return String(formData.get("idempotencyKey") ?? randomUUID());
}

export async function receiveOpening(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const parsed = z
    .object({
      warehouseId: z.string().min(1),
      materialId: z.string().optional(),
      productId: z.string().optional(),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unitCost: z.string().regex(/^\d+(\.\d{1,6})?$/),
      comment: z.string().optional(),
    })
    .safeParse({
      warehouseId: formData.get("warehouseId"),
      materialId: formData.get("materialId") || undefined,
      productId: formData.get("productId") || undefined,
      quantity: formData.get("quantity"),
      unitCost: formData.get("unitCost") || "0",
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  try {
    if (parsed.data.materialId) {
      await receiveMaterial({
        warehouseId: parsed.data.warehouseId,
        materialId: parsed.data.materialId,
        quantity: parsed.data.quantity,
        unitCost: parsed.data.unitCost,
        userId: session.user.id,
        reason: "Приход",
        comment: parsed.data.comment,
        idempotencyKey: key(formData),
      });
    } else if (parsed.data.productId) {
      await receiveProduct({
        warehouseId: parsed.data.warehouseId,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        unitCost: parsed.data.unitCost,
        userId: session.user.id,
        comment: parsed.data.comment,
        idempotencyKey: key(formData),
      });
    } else {
      return { error: "Укажите материал или изделие." };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка прихода." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "stock.receipt",
    entityType: "stock_movement",
    newValue: parsed.data,
  });
  revalidatePath("/warehouse");
  revalidatePath("/materials");
  return { ok: true };
}

export async function writeOffStock(formData: FormData) {
  const session = await requirePermission("inventory.adjust");
  const parsed = z
    .object({
      warehouseId: z.string().min(1),
      materialId: z.string().min(1),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      reason: z.string().trim().min(1).max(200),
      comment: z.string().optional(),
    })
    .safeParse({
      warehouseId: formData.get("warehouseId"),
      materialId: formData.get("materialId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  if (!canSelfApprove(session.user.roleCode) && String(formData.get("_approved") ?? "") !== "1") {
    await queueApproval({
      type: "WRITE_OFF",
      title: `Ручное списание: ${parsed.data.quantity} (${parsed.data.reason})`,
      reason: parsed.data.reason,
      entityType: "stock",
      entityId: parsed.data.materialId,
      payload: {
        warehouseId: parsed.data.warehouseId,
        materialId: parsed.data.materialId,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason,
        comment: parsed.data.comment ?? "",
        userId: session.user.id,
        idempotencyKey: key(formData),
      },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

  try {
    await writeOffMaterial({
      ...parsed.data,
      userId: session.user.id,
      idempotencyKey: key(formData),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка списания." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "stock.write_off",
    entityType: "stock_movement",
    newValue: parsed.data,
  });
  revalidatePath("/warehouse");
  return { ok: true };
}

export async function reverseStockMovement(formData: FormData) {
  const session = await requirePermission("inventory.adjust");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Нет движения." };
  try {
    await reverseMovement(id, session.user.id, key(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Сторно невозможно." };
  }
  await writeAudit({
    userId: session.user.id,
    action: "stock.reversal",
    entityType: "stock_movement",
    entityId: id,
  });
  revalidatePath("/warehouse");
  return { ok: true };
}

export async function createInventoryCount(formData: FormData) {
  const session = await requirePermission("inventory.count");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!warehouseId) return { error: "Нет склада." };

  const items = await prisma.stockItem.findMany({ where: { warehouseId } });
  const count = await prisma.inventoryCount.create({
    data: {
      workshopId: requireWorkshopId(),
      warehouseId,
      status: "DRAFT",
      countedById: session.user.id,
      lines: {
        create: items.map((item) => ({
          stockItemId: item.id,
          systemQty: item.qtyOnHand,
          actualQty: item.qtyOnHand,
          difference: "0",
          unitCost: item.wacUnitCost,
          amount: "0",
        })),
      },
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "inventory.count.create",
    entityType: "inventory_count",
    entityId: count.id,
  });
  revalidatePath("/warehouse/inventory");
  redirect(`/warehouse/inventory/${count.id}`);
}

export async function confirmInventoryCount(formData: FormData) {
  const session = await requirePermission("inventory.adjust");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !reason) return { error: "Нужны документ и причина." };

  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count || count.status !== "DRAFT") return { error: "Инвентаризация не найдена или уже проведена." };

  const actuals = formData.getAll("actualQty").map(String);
  const lineIds = formData.getAll("lineId").map(String);

  if (!canSelfApprove(session.user.roleCode) && String(formData.get("_approved") ?? "") !== "1") {
    await queueApproval({
      type: "INVENTORY",
      title: `Инвентаризационная корректировка`,
      reason,
      entityType: "inventory_count",
      entityId: id,
      payload: { id, reason, actualQty: actuals, lineId: lineIds },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

  try {
    for (let i = 0; i < lineIds.length; i += 1) {
      const line = count.lines.find((l) => l.id === lineIds[i]);
      if (!line) continue;
      const actual = D(actuals[i] || "0");
      const diff = actual.sub(D(String(line.systemQty)));
      await prisma.inventoryCountLine.update({
        where: { id: line.id },
        data: {
          actualQty: qty(actual),
          difference: qty(diff),
          amount: money(diff.mul(D(String(line.unitCost)))),
        },
      });
      await adjustToActual({
        warehouseId: count.warehouseId,
        stockItemId: line.stockItemId,
        actualQty: qty(actual),
        userId: session.user.id,
        reason,
        relatedId: count.id,
        idempotencyKey: `${id}:${line.id}`,
      });
    }
    await prisma.inventoryCount.update({
      where: { id },
      data: { status: "CONFIRMED", reason, confirmedById: session.user.id, confirmedAt: new Date() },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка проведения." };
  }

  const shortageLines = await prisma.inventoryCountLine.findMany({ where: { inventoryCountId: id } });
  const missing = shortageLines.filter((l) => D(String(l.difference)).lt(0));
  if (missing.length > 0) {
    await notifyRoles(["owner", "director"], {
      type: "inventory_shortage",
      title: "Недостача при инвентаризации",
      body: `${missing.length} позиций, причина: ${reason}`,
      entityType: "inventory_count",
      entityId: id,
    });
  }

  await writeAudit({
    userId: session.user.id,
    action: "inventory.count.confirm",
    entityType: "inventory_count",
    entityId: id,
    newValue: { reason },
  });
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/inventory");
  return { ok: true };
}

export async function transferWarehouse(formData: FormData) {
  const session = await requirePermission("inventory.adjust");
  const parsed = z
    .object({
      fromWarehouseId: z.string().min(1),
      toWarehouseId: z.string().min(1),
      materialId: z.string().optional(),
      productId: z.string().optional(),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      comment: z.string().optional(),
    })
    .safeParse({
      fromWarehouseId: formData.get("fromWarehouseId"),
      toWarehouseId: formData.get("toWarehouseId"),
      materialId: formData.get("materialId") || undefined,
      productId: formData.get("productId") || undefined,
      quantity: formData.get("quantity"),
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  try {
    await transferStock({
      fromWarehouseId: parsed.data.fromWarehouseId,
      toWarehouseId: parsed.data.toWarehouseId,
      materialId: parsed.data.materialId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      userId: session.user.id,
      comment: parsed.data.comment,
      idempotencyKey: key(formData),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось переместить." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "stock.transfer",
    entityType: "stock_movement",
    newValue: parsed.data,
  });
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  revalidatePath("/warehouse/movements");
  return { ok: true };
}

const addRawSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
  unitCost: z.string().regex(/^\d+(\.\d{1,6})?$/),
  comment: z.string().optional(),
});

export async function addRawMaterialToWarehouse(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const parsed = addRawSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? "",
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const raw = await getRawWarehouse();

  let material = await prisma.material.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" }, archivedAt: null },
  });

  if (!material) {
    const kg = await prisma.unit.findUnique({ where: { code: "KG" } });
    if (!kg) return { error: "Единица измерения не найдена." };
    material = await prisma.material.create({
      data: {
        name: parsed.data.name.trim(),
        category: "Прочее",
        storageUnitId: kg.id,
        purchaseUnitId: kg.id,
        packageWeight: "1",
        packagePrice: parsed.data.unitCost,
        minStock: "0",
        lastPurchasePrice: money(parsed.data.unitCost),
        averagePurchasePrice: money(parsed.data.unitCost),
      },
    });
    await writeAudit({
      userId: session.user.id,
      action: "material.create",
      entityType: "material",
      entityId: material.id,
      newValue: { name: material.name, from: "warehouse.add" },
    });
  }

  formData.set("materialId", material.id);
  formData.set("warehouseId", raw.id);
  const { receiveSupplierIntake } = await import("@/app/actions/purchasing");
  return receiveSupplierIntake(formData);
}
