import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toScaffoldIds, validateDomainSlug } from "../scripts/scaffold-domain/validate";

describe("domain scaffold slug validation", () => {
  it("accepts valid slugs", () => {
    assert.equal(validateDomainSlug("bakery").ok, true);
    assert.equal(validateDomainSlug("furniture_mfg").ok, true);
  });

  it("rejects empty and reserved slugs", () => {
    assert.equal(validateDomainSlug("").ok, false);
    assert.equal(validateDomainSlug("facade").ok, false);
  });

  it("rejects invalid characters", () => {
    assert.equal(validateDomainSlug("Bakery").ok, false);
    assert.equal(validateDomainSlug("1bakery").ok, false);
  });
});

describe("domain scaffold id helpers", () => {
  it("builds pascal and const prefixes", () => {
    const ids = toScaffoldIds("bakery");
    assert.equal(ids.slug, "bakery");
    assert.equal(ids.pascal, "Bakery");
    assert.equal(ids.upper, "BAKERY");
  });

  it("handles hyphenated slugs", () => {
    const ids = toScaffoldIds("custom-furniture");
    assert.equal(ids.pascal, "CustomFurniture");
    assert.equal(ids.upper, "CUSTOM_FURNITURE");
  });
});
