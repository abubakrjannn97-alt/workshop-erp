import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/core/shared/i18n/i18n";
import { getDomainI18nOverrides } from "../src/core/config/i18n-domain";
import { helpFaq, helpTour } from "../src/core/shared/i18n/help";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";

const prevDomain = process.env.WORKSHOP_DOMAIN;

afterEach(() => {
  if (prevDomain === undefined) delete process.env.WORKSHOP_DOMAIN;
  else process.env.WORKSHOP_DOMAIN = prevDomain;
});

describe("i18n domain overrides", () => {
  beforeEach(() => {
    process.env.WORKSHOP_DOMAIN = FACADE_DOMAIN_CONFIG.domain;
  });

  it("applies facade m² terminology for known keys", () => {
    assert.match(translate("ru", "products.recipeBase"), /м²/);
    assert.match(translate("ru", "emp.productionRate"), /м²/);
    assert.equal(translate("ru", "products.categoryDefault"), "Фасад");
  });

  it("returns facade override dict for active domain", () => {
    const overrides = getDomainI18nOverrides("ru");
    assert.equal(overrides["products.categoryDefault"], "Фасад");
  });

  it("applies facade help overrides", () => {
    const tour = helpTour("ru", "products");
    assert.match(tour[0]?.text ?? "", /м²/);
    const faq = helpFaq("ru").find((item) => item.id === "product");
    assert.match(faq?.a ?? "", /м²/);
  });
});

describe("i18n core without facade domain", () => {
  beforeEach(() => {
    process.env.WORKSHOP_DOMAIN = "unknown-domain";
  });

  it("falls back to generic core strings when domain is unknown", () => {
    assert.doesNotMatch(translate("ru", "products.recipeBase"), /м²/);
    assert.equal(translate("ru", "products.categoryDefault"), "products.categoryDefault");
  });
});
