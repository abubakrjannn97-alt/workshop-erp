import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";
import {
  DEFAULT_WORKSHOP_DOMAIN,
  DOMAIN_REGISTRY,
  SUPPORTED_WORKSHOP_DOMAINS,
  getDomainRegistryEntry,
  listDomainRegistryEntries,
} from "../src/domains/registry";
import { getDomainPreset } from "../src/core/config/domain-config";

describe("domain registry", () => {
  it("registers facade as default domain", () => {
    assert.equal(DEFAULT_WORKSHOP_DOMAIN, "facade");
    assert.deepEqual(SUPPORTED_WORKSHOP_DOMAINS, ["facade"]);
  });

  it("exposes facade preset aligned with domain config", () => {
    const entry = getDomainRegistryEntry("facade");
    assert.ok(entry);
    assert.equal(entry.label, "Facade Production");
    assert.equal(entry.preset.product.defaultSaleUnit, FACADE_DOMAIN_CONFIG.product.defaultSaleUnit);
    assert.equal(getDomainPreset().product.defaultCategory, entry.preset.product.defaultCategory);
  });

  it("includes i18n and help overrides for facade", () => {
    const entry = getDomainRegistryEntry("facade");
    assert.ok(entry);
    assert.equal(entry!.i18n.ru["products.categoryDefault"], "Фасад");
    assert.ok(entry!.help.ru.tour);
  });

  it("includes seed metadata for facade orchestrator", () => {
    const entry = getDomainRegistryEntry("facade");
    assert.ok(entry);
    assert.equal(entry!.seed.seedExport, "seedFacadeDomain");
    assert.equal(entry!.seed.seedModule, "domains/facade");
    assert.match(entry!.seed.runScript, /run-domain-facade/);
  });

  it("lists all registered entries", () => {
    assert.equal(listDomainRegistryEntries().length, Object.keys(DOMAIN_REGISTRY).length);
  });
});
