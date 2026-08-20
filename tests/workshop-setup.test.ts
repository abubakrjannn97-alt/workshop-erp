import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("real workshop setup", () => {
  it("facade domain seed skips opening stock when SEED_DEMO=0", async () => {
    const src = await readFile(new URL("../prisma/seeds/domains/facade.ts", import.meta.url), "utf8");
    assert.match(src, /SEED_DEMO !== "0"/);
    assert.match(src, /seedFacadeOpeningStock/);
  });

  it("validate-workshop-setup script checks core operational artifacts", async () => {
    const src = await readFile(new URL("../scripts/workshop-setup-checks.ts", import.meta.url), "utf8");
    assert.match(src, /REQUIRED_ROLES/);
    assert.match(src, /Financial funds/);
    assert.match(src, /Warehouses RAW \+ FG/);
    assert.match(src, /Products with recipes/);
    assert.match(src, /seed-opening-/);
    assert.match(src, /Domain settings/);
  });

  it("validate CLI loads env and exits non-zero on failure", async () => {
    const src = await readFile(new URL("../scripts/validate-workshop-setup.ts", import.meta.url), "utf8");
    assert.match(src, /loadLocalEnvFiles/);
    assert.match(src, /process\.exit\(1\)/);
    assert.match(src, /runWorkshopSetupChecks/);
  });

  it("prod-db-setup disables demo seed", async () => {
    const src = await readFile(new URL("../scripts/prod-db-setup.mjs", import.meta.url), "utf8");
    assert.match(src, /SEED_DEMO:\s*"0"/);
  });
});
