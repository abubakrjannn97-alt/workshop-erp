import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { finishedGoodsIssueQty, outputToSaleQty, saleToOutputQty } from "../src/core/inventory/finished-goods";

describe("finished goods conversion (sale m² ↔ output PCS)", () => {
  it("10 m² * 10 pcs per 1 m² = 100 pcs", () => {
    assert.equal(saleToOutputQty("10", "10", "1"), "100.000000");
  });

  it("100 pcs / 10 per m² = 10 m²", () => {
    assert.equal(outputToSaleQty("100", "10", "1"), "10.000000");
  });

  it("issue uses sale qty, not outputQty", () => {
    assert.equal(finishedGoodsIssueQty({ quantity: "10" }), "10.000000");
  });
});
