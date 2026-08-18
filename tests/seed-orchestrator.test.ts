import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_WORKSHOP_DOMAIN, DOMAIN_REGISTRY } from "../src/domains/registry";
import { resolveSeedDomainId } from "../prisma/seeds/orchestrator";

const prevDomain = process.env.WORKSHOP_DOMAIN;
const prevDemo = process.env.SEED_DEMO;

afterEach(() => {
  if (prevDomain === undefined) delete process.env.WORKSHOP_DOMAIN;
  else process.env.WORKSHOP_DOMAIN = prevDomain;
  if (prevDemo === undefined) delete process.env.SEED_DEMO;
  else process.env.SEED_DEMO = prevDemo;
});

describe("seed orchestrator domain resolution", () => {
  it("defaults to registry default domain", () => {
    delete process.env.WORKSHOP_DOMAIN;
    assert.equal(resolveSeedDomainId(), DEFAULT_WORKSHOP_DOMAIN);
  });

  it("respects WORKSHOP_DOMAIN env", () => {
    process.env.WORKSHOP_DOMAIN = "facade";
    assert.equal(resolveSeedDomainId(), "facade");
  });

  it("allows explicit override", () => {
    process.env.WORKSHOP_DOMAIN = "facade";
    assert.equal(resolveSeedDomainId("other"), "other");
  });
});

describe("seed orchestrator registry wiring", () => {
  for (const [domainId, entry] of Object.entries(DOMAIN_REGISTRY)) {
    it(`${domainId} domain seed module exports ${entry.seed.seedExport}`, async () => {
      const mod = await import(`../prisma/seeds/${entry.seed.seedModule}.ts`);
      assert.equal(typeof (mod as Record<string, unknown>)[entry.seed.seedExport], "function");
    });

    if (entry.seed.demoModule && entry.seed.demoExport) {
      it(`${domainId} demo seed module exports ${entry.seed.demoExport}`, async () => {
        const mod = await import(`../prisma/seeds/${entry.seed.demoModule}.ts`);
        assert.equal(typeof (mod as Record<string, unknown>)[entry.seed.demoExport!], "function");
      });
    }
  }
});
