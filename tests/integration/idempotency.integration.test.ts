import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "../../src/lib/prisma";
import { receiveProduct } from "../../src/core/inventory/stock";
import { integrationEnabled } from "./helpers";

(integrationEnabled() ? describe : describe.skip)("idempotency integration", () => {
  let warehouseId = "";
  let productId = "";
  let userId = "";

  before(async () => {
    const fg = await prisma.warehouse.findUnique({ where: { code: "FG" } });
    const product = await prisma.product.findFirst({ where: { archivedAt: null, isActive: true } });
    const user = await prisma.user.findFirst({ where: { archivedAt: null, isActive: true } });
    assert.ok(fg && product && user, "seed data required (npm run db:seed)");
    warehouseId = fg.id;
    productId = product.id;
    userId = user.id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("parallel receiveProduct with same key creates one movement", async () => {
    const key = `test-idem-${randomUUID()}`;
    const input = {
      warehouseId,
      productId,
      quantity: "1",
      unitCost: "100",
      userId,
      idempotencyKey: key,
    };

    const results = await Promise.allSettled([
      receiveProduct(input),
      receiveProduct(input),
    ]);

    for (const result of results) {
      assert.notEqual(result.status, "rejected", "duplicate parallel call must not throw");
    }

    const rows = await prisma.stockMovement.findMany({ where: { idempotencyKey: key } });
    assert.equal(rows.length, 1);
  });
});
