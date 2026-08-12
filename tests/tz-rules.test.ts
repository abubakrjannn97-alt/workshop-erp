import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { available } from "../src/lib/stock";
import { percentForCount } from "../src/lib/payroll";
import { scaleNeed } from "../src/lib/costing";
import { D } from "../src/lib/decimal";

describe("stock available", () => {
  it("onHand minus reserved", () => {
    assert.equal(available("500", "350").toFixed(3), "150.000");
  });
});

describe("seller commission tiers TZ 3/4/5", () => {
  const tiers = [
    { fromCount: 1, toCount: 10, percent: "3" },
    { fromCount: 11, toCount: 15, percent: "4" },
    { fromCount: 16, toCount: null, percent: "5" },
  ];
  it("10th order is 3%", () => {
    assert.equal(percentForCount(tiers, 10).toFixed(0), "3");
  });
  it("11th is 4%", () => {
    assert.equal(percentForCount(tiers, 11).toFixed(0), "4");
  });
  it("16th is 5%", () => {
    assert.equal(percentForCount(tiers, 16).toFixed(0), "5");
  });
});

describe("recipe scale", () => {
  it("50 m2 / base 1 = 50", () => {
    assert.equal(scaleNeed("1", "50").eq(D(50)), true);
  });
});
