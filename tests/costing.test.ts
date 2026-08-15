import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { D, money, moneyDisplay, qtyDisplay } from "../src/lib/decimal";
import { materialCostForRecipe, scaleNeed, unitCost } from "../src/lib/costing";

describe("decimal money", () => {
  it("does not use binary float for 0.1+0.2 money", () => {
    assert.equal(money(D("0.1").add("0.2")), "0.3000");
    assert.equal(moneyDisplay("12.345"), "12.35");
    assert.equal(moneyDisplay("55500"), "55500");
    assert.equal(moneyDisplay("55500.00"), "55500");
    assert.equal(qtyDisplay("380.000"), "380");
    assert.equal(qtyDisplay("10.5"), "10.5");
  });
});

describe("TZ recipe cost 1 m2", () => {
  const kg = {
    id: "kg",
    code: "KG",
    symbol: "кг",
    category: "mass",
    toBaseFactor: 1,
    baseUnitId: null,
  };
  const g = {
    id: "g",
    code: "G",
    symbol: "г",
    category: "mass",
    toBaseFactor: "0.001",
    baseUnitId: "kg",
  };
  it("white cement 7kg * 4 = 28, paint 0.4*24=9.60, glue 0.06*20=1.20", () => {
    assert.equal(unitCost("200", "50")?.toFixed(4), "4.0000");
    const result = materialCostForRecipe([
      {
        material: {
          id: "c",
          name: "Белый цемент",
          packageWeight: "50",
          packagePrice: "200",
          storageUnit: kg,
        },
        quantity: "7",
        unit: kg,
      },
      {
        material: {
          id: "p",
          name: "Краска",
          packageWeight: "25",
          packagePrice: "600",
          storageUnit: kg,
        },
        quantity: "400",
        unit: g,
      },
      {
        material: {
          id: "gl",
          name: "Клей",
          packageWeight: "25",
          packagePrice: "500",
          storageUnit: kg,
        },
        quantity: "60",
        unit: g,
      },
    ]);
    assert.equal(result.total, "38.8000");
    assert.equal(result.missingPrices, false);
  });
  it("sand without price makes total incomplete", () => {
    const result = materialCostForRecipe([
      {
        material: {
          id: "s",
          name: "Песок",
          packageWeight: "1",
          packagePrice: "0",
          storageUnit: kg,
        },
        quantity: "1",
        unit: kg,
      },
    ]);
    assert.equal(result.total, null);
    assert.equal(result.missingPrices, true);
  });
});

describe("scale", () => {
  it("scales 50 m2 against base 1", () => {
    assert.equal(scaleNeed("1", "50").toFixed(0), "50");
  });
});
