import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProductionProductId } from "../src/lib/production-order";

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
