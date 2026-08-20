/**
 * Read-only post-seed checks for real workshop readiness.
 * Used by scripts/validate-workshop-setup.ts and unit tests.
 */
import type { PrismaClient } from "@prisma/client";
import { DOMAIN_SETTING_KEYS } from "../src/core/config/settings";
import { getDomainRegistryEntry } from "../src/domains/registry";
import { resolveSeedDomainId } from "../prisma/seeds/orchestrator";

export type WorkshopCheck = { name: string; pass: boolean; detail: string };

const REQUIRED_ROLES = [
  "owner",
  "director",
  "sales_manager",
  "production_manager",
  "worker",
  "employee",
  "warehouse_manager",
  "accountant",
] as const;

const REQUIRED_FUNDS = ["MATERIALS", "LABOR", "COMMISSION", "OPEX", "PROFIT"] as const;

export async function runWorkshopSetupChecks(prisma: PrismaClient): Promise<WorkshopCheck[]> {
  const checks: WorkshopCheck[] = [];
  const domainId = resolveSeedDomainId();
  const entry = getDomainRegistryEntry(domainId);
  if (!entry) {
    checks.push({
      name: "Domain registry",
      pass: false,
      detail: `Unknown WORKSHOP_DOMAIN "${domainId}"`,
    });
    return checks;
  }
  const preset = entry.preset;

  async function check(name: string, fn: () => Promise<string> | string) {
    try {
      const detail = await fn();
      checks.push({ name, pass: true, detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      checks.push({ name, pass: false, detail });
    }
  }

  await check("Database connectivity", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return "OK";
  });

  await check("Roles", async () => {
    const roles = await prisma.role.findMany({ select: { code: true } });
    const codes = new Set(roles.map((r) => r.code));
    const missing = REQUIRED_ROLES.filter((code) => !codes.has(code));
    if (missing.length > 0) throw new Error(`Missing roles: ${missing.join(", ")}`);
    return `${roles.length} roles (${REQUIRED_ROLES.length} required)`;
  });

  await check("Owner account", async () => {
    const ownerEmail = process.env.OWNER_EMAIL ?? "owner@workshop.local";
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) throw new Error(`No user with email ${ownerEmail}`);
    const ownerRole = await prisma.role.findUnique({ where: { code: "owner" } });
    if (!ownerRole || owner.roleId !== ownerRole.id) throw new Error("Owner user is not assigned owner role");
    return ownerEmail;
  });

  await check("Warehouses RAW + FG", async () => {
    const raw = await prisma.warehouse.findUnique({ where: { code: preset.warehouses.rawCode } });
    const fg = await prisma.warehouse.findUnique({ where: { code: preset.warehouses.fgCode } });
    if (!raw || raw.kind !== "material") throw new Error(`RAW warehouse ${preset.warehouses.rawCode} missing or wrong kind`);
    if (!fg || fg.kind !== "finished") throw new Error(`FG warehouse ${preset.warehouses.fgCode} missing or wrong kind`);
    return `${raw.code} + ${fg.code}`;
  });

  await check("Cash accounts CASH + BANK", async () => {
    const cash = await prisma.cashAccount.findUnique({ where: { code: "CASH" } });
    const bank = await prisma.cashAccount.findUnique({ where: { code: "BANK" } });
    if (!cash || !bank) throw new Error("CASH or BANK account missing");
    return "CASH + BANK";
  });

  await check("Financial funds", async () => {
    const funds = await prisma.financialFund.findMany({ select: { code: true } });
    const codes = new Set(funds.map((f) => f.code));
    const missing = REQUIRED_FUNDS.filter((code) => !codes.has(code));
    if (missing.length > 0) throw new Error(`Missing funds: ${missing.join(", ")}`);
    return `${funds.length} funds`;
  });

  await check("Domain settings", async () => {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(DOMAIN_SETTING_KEYS) } },
    });
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const domain = stored.get(DOMAIN_SETTING_KEYS.workshopDomain);
    if (domain !== domainId) throw new Error(`workshop_domain=${domain ?? "unset"}, expected ${domainId}`);
    const rawCode = stored.get(DOMAIN_SETTING_KEYS.warehouseRawCode);
    const fgCode = stored.get(DOMAIN_SETTING_KEYS.warehouseFgCode);
    if (rawCode !== preset.warehouses.rawCode || fgCode !== preset.warehouses.fgCode) {
      throw new Error(`Warehouse codes mismatch: raw=${rawCode} fg=${fgCode}`);
    }
    return `domain=${domainId}`;
  });

  await check("Pay schemes", async () => {
    const sales = await prisma.payScheme.findUnique({ where: { code: "sales_commission" } });
    const production = await prisma.payScheme.findUnique({
      where: { code: preset.payroll.productionScheme },
    });
    if (!sales) throw new Error("sales_commission scheme missing");
    if (!production) throw new Error(`${preset.payroll.productionScheme} scheme missing`);
    return `${sales.code} + ${production.code}`;
  });

  await check("Materials catalog", async () => {
    const count = await prisma.material.count();
    if (count < 1) throw new Error("No materials — add real catalog or run domain seed");
    return `${count} materials`;
  });

  await check("Products with recipes", async () => {
    const products = await prisma.product.count();
    const withRecipe = await prisma.recipe.count();
    if (products < 1) throw new Error("No products");
    if (withRecipe < 1) throw new Error("No recipes");
    const versions = await prisma.recipeVersion.count({ where: { validTo: null } });
    if (versions < 1) throw new Error("No active recipe version");
    return `${products} products, ${withRecipe} recipes, ${versions} active versions`;
  });

  await check("Production stages", async () => {
    const count = await prisma.productionStage.count({ where: { isActive: true } });
    if (count < 4) throw new Error(`Only ${count} active stages, expected ≥4`);
    return `${count} stages`;
  });

  await check("Order workflow statuses", async () => {
    const required = ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "ISSUED", "COMPLETED"];
    const statuses = await prisma.orderStatus.findMany({ select: { code: true } });
    const codes = new Set(statuses.map((s) => s.code));
    const missing = required.filter((code) => !codes.has(code));
    if (missing.length > 0) throw new Error(`Missing statuses: ${missing.join(", ")}`);
    return `${statuses.length} statuses`;
  });

  await check("No seed opening stock (production baseline)", async () => {
    const seedMoves = await prisma.stockMovement.count({
      where: { idempotencyKey: { startsWith: "seed-opening-" } },
    });
    if (seedMoves > 0) {
      throw new Error(
        `${seedMoves} seed opening-stock movements found — production DB should start with zero inventory`,
      );
    }
    return "0 seed movements";
  });

  return checks;
}

export function summarizeWorkshopChecks(checks: WorkshopCheck[]): { passed: number; failed: number } {
  return {
    passed: checks.filter((c) => c.pass).length,
    failed: checks.filter((c) => !c.pass).length,
  };
}
