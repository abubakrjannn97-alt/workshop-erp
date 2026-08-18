import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBatchFinishedGoods, resolveProductionProductId } from "../src/core/production/production-order";

describe("resolveProductionProductId", () => {
  it("returns null for empty order items", () => {
    assert.equal(resolveProductionProductId([]), null);
  });

  it("returns product id for single-item order", () => {
    assert.equal(resolveProductionProductId([{ productId: "p1" }]), "p1");
  });

  it("returns product id when multiple lines share the same product", () => {
    assert.equal(
      resolveProductionProductId([
        { productId: "p1" },
        { productId: "p1" },
      ]),
      "p1",
    );
  });

  it("returns null when order has different products", () => {
    assert.equal(
      resolveProductionProductId([
        { productId: "p1" },
        { productId: "p2" },
      ]),
      null,
    );
  });
});

describe("resolveBatchFinishedGoods", () => {
  it("splits batch actual qty across mixed products by sale-qty share", () => {
    const lines = resolveBatchFinishedGoods(
      [
        { productId: "p1", quantity: "5" },
        { productId: "p2", quantity: "5" },
      ],
      "10",
      "10",
    );
    assert.equal(lines.length, 2);
    assert.equal(lines.find((l) => l.productId === "p1")?.quantity, "5.000000");
    assert.equal(lines.find((l) => l.productId === "p2")?.quantity, "5.000000");
  });
});
