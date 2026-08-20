import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { getDomainPreset } from "../src/core/config/domain-config";
import { DOMAIN_REGISTRY, SUPPORTED_WORKSHOP_DOMAINS } from "../src/domains/registry";
import { seedDomainOnly } from "../prisma/seeds/orchestrator";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE_DIR = path.join(ROOT, "src", "core");
const SCHEMA = path.join(ROOT, "prisma", "schema.prisma");

const ALLOWED_CORE_DOMAIN_IMPORTS = new Set([
  "src/core/config/domain-config.ts",
  "src/core/config/i18n-domain.ts",
  "src/core/config/workshop-domain.ts",
]);

const DOMAIN_LEAK = /bakery|Фасад|Выпечка|production_m2|FACADE_|BAKERY_/i;

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function rel(file: string) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

describe("architecture — core/domain import isolation", () => {
  it("only documented bridge files in core import @/domains", () => {
    const offenders: string[] = [];
    for (const file of listTsFiles(CORE_DIR)) {
      const text = fs.readFileSync(file, "utf8");
      if (!text.includes("@/domains")) continue;
      const key = rel(file);
      if (!ALLOWED_CORE_DOMAIN_IMPORTS.has(key)) offenders.push(key);
    }
    assert.deepEqual(offenders, []);
  });

  it("non-bridge core files do not mention bakery/facade product terms", () => {
    const offenders: string[] = [];
    for (const file of listTsFiles(CORE_DIR)) {
      const key = rel(file);
      if (ALLOWED_CORE_DOMAIN_IMPORTS.has(key)) continue;
      const text = fs.readFileSync(file, "utf8");
      if (DOMAIN_LEAK.test(text)) offenders.push(key);
    }
    assert.deepEqual(offenders, []);
  });
});

describe("architecture — prisma schema independence", () => {
  it("schema has no facade/bakery domain literals", () => {
    const schema = fs.readFileSync(SCHEMA, "utf8");
    assert.doesNotMatch(schema, /facade|bakery|Фасад|Выпечка|production_m2/i);
  });
});

describe("architecture — registry contract", () => {
  it("every registered domain has preset, i18n, help, and seed wiring", () => {
    for (const id of SUPPORTED_WORKSHOP_DOMAINS) {
      const entry = DOMAIN_REGISTRY[id];
      assert.ok(entry, id);
      assert.equal(entry.id, id);
      assert.ok(entry.preset.warehouses.rawCode);
      assert.ok(entry.preset.warehouses.fgCode);
      assert.ok(entry.preset.payroll.productionScheme);
      assert.ok(entry.preset.product.defaultSaleUnit);
      assert.ok(entry.i18n.ru);
      assert.ok(entry.i18n.tj);
      assert.ok(entry.help.ru);
      assert.ok(entry.seed.seedExport);
      assert.ok(entry.seed.seedModule);
    }
  });

  it("unknown WORKSHOP_DOMAIN throws from getDomainPreset", () => {
    const prev = process.env.WORKSHOP_DOMAIN;
    process.env.WORKSHOP_DOMAIN = "not-a-registered-domain";
    try {
      assert.throws(() => getDomainPreset(), /Unknown WORKSHOP_DOMAIN/);
    } finally {
      if (prev === undefined) delete process.env.WORKSHOP_DOMAIN;
      else process.env.WORKSHOP_DOMAIN = prev;
    }
  });

  it("unknown domain seed is rejected before catalog work", async () => {
    await assert.rejects(
      () => seedDomainOnly({} as never, { domainId: "not-a-registered-domain" }),
      /Unknown WORKSHOP_DOMAIN/,
    );
  });
});

describe("architecture — warehouse codes come from preset", () => {
  it("facade and bakery both expose raw/fg warehouse codes", () => {
    const prev = process.env.WORKSHOP_DOMAIN;
    try {
      process.env.WORKSHOP_DOMAIN = "facade";
      const facade = getDomainPreset();
      process.env.WORKSHOP_DOMAIN = "bakery";
      const bakery = getDomainPreset();
      assert.ok(facade.warehouses.rawCode);
      assert.ok(bakery.warehouses.fgCode);
      assert.notEqual(facade.product.defaultSaleUnit, bakery.product.defaultSaleUnit);
    } finally {
      if (prev === undefined) delete process.env.WORKSHOP_DOMAIN;
      else process.env.WORKSHOP_DOMAIN = prev;
    }
  });
});
