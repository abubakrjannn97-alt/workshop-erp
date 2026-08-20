import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOMAIN_SETTING_KEYS, domainSettingsFromPreset } from "../src/core/config/settings";
import { getDomainPreset, mergeDomainConfig } from "../src/core/config/domain-config";
import { DOMAIN_REGISTRY } from "../src/domains/registry";
import { domainHasDemo } from "../prisma/seeds/demo-loader";
import { buildScaffoldFiles } from "../scripts/scaffold-domain/templates";

describe("domain settings persistence mapping", () => {
  it("maps preset fields onto DOMAIN_SETTING_KEYS without domain if/else", () => {
    const bakery = DOMAIN_REGISTRY.bakery.preset;
    const mapped = domainSettingsFromPreset(bakery);
    assert.equal(mapped[DOMAIN_SETTING_KEYS.workshopDomain], "bakery");
    assert.equal(mapped[DOMAIN_SETTING_KEYS.productDefaultSaleUnit], bakery.product.defaultSaleUnit);
    assert.equal(mapped[DOMAIN_SETTING_KEYS.payrollProductionScheme], bakery.payroll.productionScheme);

    const facade = DOMAIN_REGISTRY.facade.preset;
    const facadeMapped = domainSettingsFromPreset(facade);
    assert.equal(facadeMapped[DOMAIN_SETTING_KEYS.workshopDomain], "facade");
    assert.equal(facadeMapped[DOMAIN_SETTING_KEYS.productDefaultSaleUnit], facade.product.defaultSaleUnit);
  });
});

describe("mergeDomainConfig clone isolation", () => {
  it("ignores leftover settings from another domain", () => {
    const prev = process.env.WORKSHOP_DOMAIN;
    process.env.WORKSHOP_DOMAIN = "bakery";
    try {
      const bakeryPreset = getDomainPreset();
      const stored = new Map([
        [DOMAIN_SETTING_KEYS.workshopDomain, "facade"],
        [DOMAIN_SETTING_KEYS.productDefaultSaleUnit, "M2"],
      ]);
      const merged = mergeDomainConfig(bakeryPreset, stored);
      assert.equal(merged.domain, "bakery");
      assert.equal(merged.product.defaultSaleUnit, bakeryPreset.product.defaultSaleUnit);
      assert.notEqual(merged.product.defaultSaleUnit, "M2");
    } finally {
      if (prev === undefined) delete process.env.WORKSHOP_DOMAIN;
      else process.env.WORKSHOP_DOMAIN = prev;
    }
  });

  it("applies matching stored settings", () => {
    const prev = process.env.WORKSHOP_DOMAIN;
    process.env.WORKSHOP_DOMAIN = "bakery";
    try {
      const preset = getDomainPreset();
      const stored = new Map([
        [DOMAIN_SETTING_KEYS.workshopDomain, "bakery"],
        [DOMAIN_SETTING_KEYS.warehouseRawCode, "FLOUR"],
      ]);
      const merged = mergeDomainConfig(preset, stored);
      assert.equal(merged.warehouses.rawCode, "FLOUR");
      assert.equal(merged.product.defaultSaleUnit, preset.product.defaultSaleUnit);
    } finally {
      if (prev === undefined) delete process.env.WORKSHOP_DOMAIN;
      else process.env.WORKSHOP_DOMAIN = prev;
    }
  });
});

describe("demo-loader registry contract", () => {
  it("facade has demo, bakery does not — without if (domain === bakery) in loader", () => {
    assert.equal(domainHasDemo(DOMAIN_REGISTRY.facade), true);
    assert.equal(domainHasDemo(DOMAIN_REGISTRY.bakery), false);
  });
});

describe("scaffold domain seed uses persist helper", () => {
  it("generated seed calls persistDomainSettings", () => {
    const files = buildScaffoldFiles({
      slug: "furniture",
      displayName: "Furniture Production",
      defaultCategory: "Мебель",
      rawCode: "RAW",
      fgCode: "FG",
      productionScheme: "production_pcs",
      defaultSaleUnit: "PCS",
      defaultOutputUnit: "PCS",
      defaultOutputPerBase: 1,
    });
    const seed = files["prisma/seeds/domains/furniture.ts"];
    assert.match(seed, /persistDomainSettings/);
    assert.match(seed, /kind: "PRODUCTION"/);
    assert.doesNotMatch(seed, /DOMAIN_SETTING_KEYS/);
  });
});
