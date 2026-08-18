import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";
import { DOMAIN_SETTING_KEYS } from "../src/lib/settings";

describe("facade domain config", () => {
  it("raw warehouse code is RAW", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.warehouses.rawCode, "RAW");
  });

  it("finished goods warehouse code is FG", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.warehouses.fgCode, "FG");
  });

  it("production payroll scheme is production_m2", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.payroll.productionScheme, "production_m2");
  });

  it("default sale unit is M2", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.product.defaultSaleUnit, "M2");
  });

  it("default output unit is PCS", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.product.defaultOutputUnit, "PCS");
  });

  it("default category is Фасад", () => {
    assert.equal(FACADE_DOMAIN_CONFIG.product.defaultCategory, "Фасад");
  });
});

describe("domain setting keys", () => {
  it("defines universal configuration keys", () => {
    assert.equal(DOMAIN_SETTING_KEYS.warehouseRawCode, "warehouse.rawCode");
    assert.equal(DOMAIN_SETTING_KEYS.warehouseFgCode, "warehouse.fgCode");
    assert.equal(DOMAIN_SETTING_KEYS.payrollProductionScheme, "payroll.productionScheme");
    assert.equal(DOMAIN_SETTING_KEYS.productDefaultSaleUnit, "product.defaultSaleUnit");
    assert.equal(DOMAIN_SETTING_KEYS.productDefaultOutputUnit, "product.defaultOutputUnit");
    assert.equal(DOMAIN_SETTING_KEYS.productDefaultCategory, "product.defaultCategory");
  });
});
