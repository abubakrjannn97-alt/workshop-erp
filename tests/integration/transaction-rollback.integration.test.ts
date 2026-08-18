import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "../../src/lib/prisma";
import { receiveProduct } from "../../src/core/inventory/stock";
import { D } from "../../src/core/shared/decimal";
import { integrationEnabled } from "./helpers";

(integrationEnabled() ? describe : describe.skip)("transaction rollback integration", () => {
  let warehouseId = "";
  let productId = "";
  let userId = "";
  let stockItemId = "";

  before(async () => {
    const fg = await prisma.warehouse.findUnique({ where: { code: "FG" } });
    const product = await prisma.product.findFirst({ where: { archivedAt: null, isActive: true } });
    const user = await prisma.user.findFirst({ where: { archivedAt: null, isActive: true } });
    assert.ok(fg && product && user, "seed data required (npm run db:seed)");
    warehouseId = fg.id;
    productId = product.id;
    userId = user.id;

    const item = await prisma.stockItem.findFirst({
      where: { warehouseId, productId, materialId: null },
    });
    if (item) {
      stockItemId = item.id;
    } else {
      const created = await prisma.stockItem.create({
        data: {
          warehouseId,
          productId,
          qtyOnHand: "0",
          qtyReserved: "0",
          wacUnitCost: "0",
        },
      });
      stockItemId = created.id;
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("rolls back stock changes when transaction fails mid-chain", async () => {
    assert.ok(stockItemId, "stock item required for rollback test");

    const before = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    assert.ok(before);
    const onHandBefore = D(String(before.qtyOnHand));
    const key = `test-rollback-${randomUUID()}`;

    await assert.rejects(async () => {
      await prisma.$transaction(async (tx) => {
        await receiveProduct(
          {
            warehouseId,
            productId,
            quantity: "2",
            unitCost: "50",
            userId,
            idempotencyKey: key,
          },
          tx,
        );
        throw new Error("simulated failure");
      });
    }, /simulated failure/);

    const after = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    assert.ok(after);
    assert.equal(D(String(after.qtyOnHand)).toFixed(3), onHandBefore.toFixed(3));

    const movement = await prisma.stockMovement.findUnique({ where: { idempotencyKey: key } });
    assert.equal(movement, null);
  });
});
