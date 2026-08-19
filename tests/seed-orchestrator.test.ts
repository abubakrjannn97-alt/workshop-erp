import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_WORKSHOP_DOMAIN, DOMAIN_REGISTRY } from "../src/domains/registry";
import { resolveSeedDomainId } from "../prisma/seeds/orchestrator";
import { resolveSeedOwnerPassword } from "../prisma/seeds/core";

const prevDomain = process.env.WORKSHOP_DOMAIN;
const prevDemo = process.env.SEED_DEMO;
const prevNodeEnv = process.env.NODE_ENV;
const prevOwnerPassword = process.env.OWNER_PASSWORD;

afterEach(() => {
  if (prevDomain === undefined) delete process.env.WORKSHOP_DOMAIN;
  else process.env.WORKSHOP_DOMAIN = prevDomain;
  if (prevDemo === undefined) delete process.env.SEED_DEMO;
  else process.env.SEED_DEMO = prevDemo;
  if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prevNodeEnv;
  if (prevOwnerPassword === undefined) delete process.env.OWNER_PASSWORD;
  else process.env.OWNER_PASSWORD = prevOwnerPassword;
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

describe("production seed setup", () => {
  it("disables demo seed for production bootstrap", async () => {
    const script = await readFile(new URL("../scripts/prod-db-setup.mjs", import.meta.url), "utf8");
    assert.match(script, /SEED_DEMO:\s*"0"/);
    assert.doesNotMatch(script, /seed-demo\.ts/);
  });

  it("requires explicit non-demo owner password in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.OWNER_PASSWORD;
    assert.throws(() => resolveSeedOwnerPassword(), /OWNER_PASSWORD must be explicitly set/);

    process.env.OWNER_PASSWORD = "StrongPilotPassword123!";
    assert.equal(resolveSeedOwnerPassword(), "StrongPilotPassword123!");
  });
});
