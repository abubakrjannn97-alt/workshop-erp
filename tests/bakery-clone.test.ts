import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { BAKERY_DOMAIN_CONFIG } from "../src/domains/bakery/config";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";
import { getDomainRegistryEntry } from "../src/domains/registry";
import { getDomainPreset } from "../src/core/config/domain-config";
import { getDomainHelpOverrides, getDomainI18nOverrides } from "../src/core/config/i18n-domain";
import { translate } from "../src/core/shared/i18n/i18n";
import { helpFaq, helpTour } from "../src/core/shared/i18n/help";
import { resolveSeedDomainId } from "../prisma/seeds/orchestrator";

const prevDomain = process.env.WORKSHOP_DOMAIN;

afterEach(() => {
  if (prevDomain === undefined) delete process.env.WORKSHOP_DOMAIN;
  else process.env.WORKSHOP_DOMAIN = prevDomain;
});

describe("bakery clone proof — preset isolation", () => {
  it("bakery config differs from facade (units, category, pay scheme)", () => {
    assert.notEqual(BAKERY_DOMAIN_CONFIG.product.defaultSaleUnit, FACADE_DOMAIN_CONFIG.product.defaultSaleUnit);
    assert.notEqual(BAKERY_DOMAIN_CONFIG.product.defaultCategory, FACADE_DOMAIN_CONFIG.product.defaultCategory);
    assert.notEqual(BAKERY_DOMAIN_CONFIG.payroll.productionScheme, FACADE_DOMAIN_CONFIG.payroll.productionScheme);
    assert.equal(BAKERY_DOMAIN_CONFIG.product.defaultSaleUnit, "KG");
    assert.equal(BAKERY_DOMAIN_CONFIG.product.defaultCategory, "Выпечка");
    assert.equal(BAKERY_DOMAIN_CONFIG.payroll.productionScheme, "production_pcs");
  });

  it("WORKSHOP_DOMAIN=bakery resolves bakery preset without changing facade defaults", () => {
    process.env.WORKSHOP_DOMAIN = "bakery";
    const bakery = getDomainPreset();
    assert.equal(bakery.domain, "bakery");
    assert.equal(bakery.product.defaultSaleUnit, "KG");
    assert.equal(bakery.product.defaultOutputPerBase, 1);
    assert.equal(bakery.payroll.productionScheme, "production_pcs");

    process.env.WORKSHOP_DOMAIN = "facade";
    const facade = getDomainPreset();
    assert.equal(facade.domain, "facade");
    assert.equal(facade.product.defaultSaleUnit, "M2");
    assert.equal(facade.product.defaultCategory, "Фасад");
    assert.equal(facade.payroll.productionScheme, "production_m2");
  });

  it("default domain remains facade", () => {
    delete process.env.WORKSHOP_DOMAIN;
    const preset = getDomainPreset();
    assert.equal(preset.domain, "facade");
    assert.equal(preset.product.defaultSaleUnit, "M2");
  });
});

describe("bakery clone proof — i18n isolation", () => {
  it("bakery overrides use kg/piece, not m²", () => {
    process.env.WORKSHOP_DOMAIN = "bakery";
    assert.match(translate("ru", "products.recipeBase"), /кг/);
    assert.doesNotMatch(translate("ru", "products.recipeBase"), /м²/);
    assert.equal(translate("ru", "products.categoryDefault"), "Выпечка");
    assert.equal(getDomainI18nOverrides("ru")["products.categoryDefault"], "Выпечка");
  });

  it("facade m² copy is unchanged when bakery is registered", () => {
    process.env.WORKSHOP_DOMAIN = "facade";
    assert.match(translate("ru", "products.recipeBase"), /м²/);
    assert.equal(translate("ru", "products.categoryDefault"), "Фасад");
  });

  it("bakery help copy is kg, not tile/m²", () => {
    process.env.WORKSHOP_DOMAIN = "bakery";
    const tour = helpTour("ru", "products");
    assert.match(tour[0]?.text ?? "", /кг/);
    const faq = helpFaq("ru").find((item) => item.id === "product");
    assert.match(faq?.a ?? "", /кг/);
    assert.doesNotMatch(faq?.a ?? "", /м²/);
    assert.ok(getDomainHelpOverrides("ru").tour["products:nav-products"]);
  });
});

describe("bakery clone proof — seed wiring", () => {
  it("registry points at bakery seed module", () => {
    const entry = getDomainRegistryEntry("bakery");
    assert.ok(entry);
    assert.equal(entry.seed.seedExport, "seedBakeryDomain");
    assert.equal(entry.seed.seedModule, "domains/bakery");
    assert.equal(entry.seed.runScript, "prisma/seeds/run-domain-bakery.ts");
    assert.equal(entry.seed.demoModule, undefined);
  });

  it("orchestrator resolves bakery from WORKSHOP_DOMAIN", () => {
    process.env.WORKSHOP_DOMAIN = "bakery";
    assert.equal(resolveSeedDomainId(), "bakery");
  });

  it("bakery seed export exists", async () => {
    const mod = await import("../prisma/seeds/domains/bakery.ts");
    assert.equal(typeof mod.seedBakeryDomain, "function");
  });
});
