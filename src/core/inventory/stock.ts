import { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { D, money, qty } from "@core/shared/decimal";
import { assertPeriodOpen } from "@core/control/control";
import { resolveRawWarehouseCode } from "@/core/config/resolve-warehouse";

export const MOVEMENT = {
  RECEIPT: "RECEIPT",
  RESERVE: "RESERVE",
  RELEASE: "RELEASE",
  ISSUE: "ISSUE",
  RETURN: "RETURN",
  WRITE_OFF: "WRITE_OFF",
  INVENTORY: "INVENTORY",
  ADJUST: "ADJUST",
  TRANSFER_OUT: "TRANSFER_OUT",
  TRANSFER_IN: "TRANSFER_IN",
  REVERSAL: "REVERSAL",
} as const;

type Tx = Prisma.TransactionClient;

function n(value: { toString(): string } | string | number) {
  return D(String(value));
}

export function available(onHand: { toString(): string }, reserved: { toString(): string }) {
  return n(onHand).sub(n(reserved));
}

async function existingByKey(tx: Tx, idempotencyKey?: string | null) {
  if (!idempotencyKey) return null;
  return tx.stockMovement.findUnique({ where: { idempotencyKey } });
}

async function createMovementIdempotent(
  tx: Tx,
  data: Prisma.StockMovementUncheckedCreateInput | { data: Prisma.StockMovementUncheckedCreateInput },
) {
  const payload = "data" in data ? data.data : data;
  try {
    return await tx.stockMovement.create({ data: payload });
  } catch (e) {
    if (
      payload.idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await existingByKey(tx, payload.idempotencyKey);
      if (existing) return existing;
    }
    throw e;
  }
}

export async function getOrCreateMaterialStock(tx: Tx, warehouseId: string, materialId: string) {
  return tx.stockItem.upsert({
    where: { warehouseId_materialId: { warehouseId, materialId } },
    create: { warehouseId, materialId, qtyOnHand: "0", qtyReserved: "0", wacUnitCost: "0" },
    update: {},
  });
}

export async function getOrCreateProductStock(
  tx: Tx,
  warehouseId: string,
  productId: string,
  variantId?: string | null,
) {
  const found = await tx.stockItem.findFirst({
    where: { warehouseId, productId, variantId: variantId ?? null, materialId: null },
  });
  if (found) return found;
  return tx.stockItem.create({
    data: {
      warehouseId,
      productId,
      variantId: variantId ?? null,
      qtyOnHand: "0",
      qtyReserved: "0",
      wacUnitCost: "0",
    },
  });
}

async function syncMaterialQty(tx: Tx, materialId: string | null, warehouseId: string) {
  if (!materialId) return;
  const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
  const rawCode = await resolveRawWarehouseCode();
  if (warehouse?.code !== rawCode) return;
  const item = await tx.stockItem.findUnique({
    where: { warehouseId_materialId: { warehouseId, materialId } },
  });
  await tx.material.update({
    where: { id: materialId },
    data: { currentStock: item ? qty(item.qtyOnHand) : "0" },
  });
}

export async function receiveMaterial(
  input: {
    warehouseId: string;
    materialId: string;
    quantity: string;
    unitCost: string;
    userId: string;
    reason?: string;
    comment?: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    await assertPeriodOpen();

    const item = await getOrCreateMaterialStock(tx, input.warehouseId, input.materialId);
    const incoming = n(input.quantity);
    if (incoming.lte(0)) throw new Error("Количество прихода должно быть больше нуля.");

    const oldQty = n(item.qtyOnHand);
    const oldWac = n(item.wacUnitCost);
    const cost = n(input.unitCost);
    const newQty = oldQty.add(incoming);
    const newWac = newQty.lte(0)
      ? cost
      : oldQty.lte(0)
        ? cost
        : oldQty.mul(oldWac).add(incoming.mul(cost)).div(newQty);

    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(newQty), wacUnitCost: qty(newWac) },
    });
    await syncMaterialQty(tx, input.materialId, input.warehouseId);

    await tx.material.update({
      where: { id: input.materialId },
      data: {
        lastPurchasePrice: qty(cost),
        averagePurchasePrice: qty(newWac),
      },
    });

    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.RECEIPT,
        qty: qty(incoming),
        unitCost: qty(cost),
        amount: money(incoming.mul(cost)),
        reason: input.reason ?? null,
        comment: input.comment ?? null,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function receiveProduct(
  input: {
    warehouseId: string;
    productId: string;
    quantity: string;
    unitCost: string;
    userId: string;
    comment?: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    const item = await getOrCreateProductStock(tx, input.warehouseId, input.productId);
    const incoming = n(input.quantity);
    if (incoming.lte(0)) throw new Error("Количество прихода должно быть больше нуля.");
    const oldQty = n(item.qtyOnHand);
    const oldWac = n(item.wacUnitCost);
    const cost = n(input.unitCost);
    const newQty = oldQty.add(incoming);
    const newWac = oldQty.lte(0) ? cost : oldQty.mul(oldWac).add(incoming.mul(cost)).div(newQty);
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(newQty), wacUnitCost: qty(newWac) },
    });
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.RECEIPT,
        qty: qty(incoming),
        unitCost: qty(cost),
        amount: money(incoming.mul(cost)),
        comment: input.comment ?? null,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function reserveMaterial(
  input: {
    warehouseId: string;
    materialId: string;
    quantity: string;
    userId: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
    partial?: boolean;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) {
      return { movement: dup, reserved: qty(dup.reservedDelta), shortage: "0" };
    }
    const item = await getOrCreateMaterialStock(tx, input.warehouseId, input.materialId);
    const need = n(input.quantity);
    if (need.lte(0)) return { movement: null, reserved: "0", shortage: "0" };
    const avail = available(item.qtyOnHand, item.qtyReserved);
    const toReserve = input.partial ? (avail.lt(need) ? avail : need) : need;
    if (!input.partial && avail.lt(need)) {
      throw new Error(`Недостаточно доступного остатка. Доступно: ${avail.toFixed(3)}.`);
    }
    if (toReserve.lte(0)) {
      return { movement: null, reserved: "0", shortage: qty(need) };
    }
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyReserved: qty(n(item.qtyReserved).add(toReserve)) },
    });
    const movement = await createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.RESERVE,
        qty: "0",
        reservedDelta: qty(toReserve),
        unitCost: qty(item.wacUnitCost),
        amount: "0",
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
    return { movement, reserved: qty(toReserve), shortage: qty(need.sub(toReserve)) };
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function releaseMaterial(
  input: {
    warehouseId: string;
    materialId: string;
    quantity: string;
    userId: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    const item = await getOrCreateMaterialStock(tx, input.warehouseId, input.materialId);
    const out = n(input.quantity);
    if (out.lte(0)) return null;
    const reserved = n(item.qtyReserved);
    if (reserved.lt(out)) {
      throw new Error(`Нельзя снять резерв больше зарезервированного. Резерв: ${reserved.toFixed(3)}.`);
    }
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyReserved: qty(reserved.sub(out)) },
    });
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.RELEASE,
        qty: "0",
        reservedDelta: qty(out.neg()),
        unitCost: qty(item.wacUnitCost),
        amount: "0",
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function writeOffMaterial(
  input: {
    warehouseId: string;
    materialId: string;
    quantity: string;
    userId: string;
    type?: string;
    reason: string;
    comment?: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
    consumeReserved?: boolean;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    await assertPeriodOpen();
    const item = await getOrCreateMaterialStock(tx, input.warehouseId, input.materialId);
    const out = n(input.quantity);
    if (out.lte(0)) throw new Error("Количество списания должно быть больше нуля.");
    const avail = input.consumeReserved
      ? n(item.qtyOnHand)
      : available(item.qtyOnHand, item.qtyReserved);
    if (avail.lt(out)) {
      throw new Error(`Недостаточно остатка. Доступно: ${avail.toFixed(3)}.`);
    }
    const reserved = input.consumeReserved
      ? n(item.qtyReserved).sub(out).lt(0)
        ? D(0)
        : n(item.qtyReserved).sub(out)
      : n(item.qtyReserved);
    const newQty = n(item.qtyOnHand).sub(out);
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(newQty), qtyReserved: qty(reserved) },
    });
    await syncMaterialQty(tx, input.materialId, input.warehouseId);
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: input.type ?? MOVEMENT.WRITE_OFF,
        qty: qty(out.neg()),
        reservedDelta: input.consumeReserved ? qty(n(item.qtyReserved).sub(reserved).neg()) : "0",
        unitCost: qty(item.wacUnitCost),
        amount: money(out.mul(n(item.wacUnitCost)).neg()),
        reason: input.reason,
        comment: input.comment ?? null,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function writeOffProduct(
  input: {
    warehouseId: string;
    productId: string;
    quantity: string;
    userId: string;
    reason: string;
    relatedType?: string;
    relatedId?: string;
    idempotencyKey?: string;
  },
  externalTx?: Tx,
) {
  const run = async (tx: Tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    const item = await getOrCreateProductStock(tx, input.warehouseId, input.productId);
    const out = n(input.quantity);
    if (out.lte(0)) throw new Error("Количество выдачи должно быть больше нуля.");
    const avail = available(item.qtyOnHand, item.qtyReserved);
    if (avail.lt(out)) {
      throw new Error(`Недостаточно готовой продукции. Доступно: ${avail.toFixed(3)}.`);
    }
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(n(item.qtyOnHand).sub(out)) },
    });
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.ISSUE,
        qty: qty(out.neg()),
        unitCost: qty(item.wacUnitCost),
        amount: money(out.mul(n(item.wacUnitCost)).neg()),
        reason: input.reason,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  };
  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

export async function adjustToActual(input: {
  warehouseId: string;
  stockItemId: string;
  actualQty: string;
  userId: string;
  reason: string;
  relatedId: string;
  idempotencyKey?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const dup = await existingByKey(tx, input.idempotencyKey);
    if (dup) return dup;
    const item = await tx.stockItem.findUniqueOrThrow({ where: { id: input.stockItemId } });
    const actual = n(input.actualQty);
    const diff = actual.sub(n(item.qtyOnHand));
    if (diff.eq(0)) return null;
    if (actual.lt(n(item.qtyReserved))) {
      throw new Error("Фактический остаток меньше резерва. Сначала снимите резерв.");
    }
    let newWac = n(item.wacUnitCost);
    if (diff.gt(0) && n(item.qtyOnHand).lte(0)) {
      newWac = n(item.wacUnitCost);
    }
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(actual), wacUnitCost: qty(newWac) },
    });
    await syncMaterialQty(tx, item.materialId, input.warehouseId);
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: input.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.INVENTORY,
        qty: qty(diff),
        unitCost: qty(item.wacUnitCost),
        amount: money(diff.mul(n(item.wacUnitCost))),
        reason: input.reason,
        relatedType: "inventory_count",
        relatedId: input.relatedId,
        idempotencyKey: input.idempotencyKey ?? null,
        createdById: input.userId,
      },
    });
  });
}

export async function reverseMovement(movementId: string, userId: string, idempotencyKey?: string) {
  return prisma.$transaction(async (tx) => {
    const dup = await existingByKey(tx, idempotencyKey);
    if (dup) return dup;
    const original = await tx.stockMovement.findUnique({
      where: { id: movementId },
      include: { reversedBy: true, stockItem: true },
    });
    if (!original) throw new Error("Движение не найдено.");
    if (original.reversedBy) throw new Error("Движение уже сторнировано.");
    if (original.type === MOVEMENT.REVERSAL) throw new Error("Нельзя сторнировать сторно.");

    const item = original.stockItem;
    const qtyDelta = n(original.qty).neg();
    const reservedDelta = n(original.reservedDelta).neg();
    const newOnHand = n(item.qtyOnHand).add(qtyDelta);
    const newReserved = n(item.qtyReserved).add(reservedDelta);
    if (newOnHand.lt(0) || newReserved.lt(0) || newOnHand.lt(newReserved)) {
      throw new Error("Сторно невозможно: остаток станет некорректным.");
    }
    await tx.stockItem.update({
      where: { id: item.id },
      data: { qtyOnHand: qty(newOnHand), qtyReserved: qty(newReserved) },
    });
    await syncMaterialQty(tx, item.materialId, original.warehouseId);
    return createMovementIdempotent(tx, {
      data: {
        warehouseId: original.warehouseId,
        stockItemId: item.id,
        type: MOVEMENT.REVERSAL,
        qty: qty(qtyDelta),
        reservedDelta: qty(reservedDelta),
        unitCost: qty(original.unitCost),
        amount: money(n(original.amount).neg()),
        reason: "Сторно",
        relatedType: "stock_movement",
        relatedId: original.id,
        reversesId: original.id,
        idempotencyKey: idempotencyKey ?? null,
        createdById: userId,
      },
    });
  });
}
