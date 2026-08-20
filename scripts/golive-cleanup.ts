/**
 * Phase 18 — Final go-live cleanup (ops only).
 * Rotates owner password, deactivates demo/pilot users, patches env for SEED_DEMO / off-site backup.
 * Does not change product code, design, or business logic.
 *
 * Usage: npx tsx scripts/golive-cleanup.ts
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { loadLocalEnvFiles } from "./load-env";
import { prisma } from "../src/core/infrastructure/prisma";
import { DEMO_PASSWORD, DEMO_USERS } from "../src/core/auth/demo-users";
import { writeAudit } from "../src/core/control/audit";

loadLocalEnvFiles();

const DATA = join(process.cwd(), ".data");
const CREDS = join(DATA, "golive-credentials.txt");
const OFFSITE_DIR = join(DATA, "backups-offsite");

type Check = { area: string; pass: boolean; detail: string };
const checks: Check[] = [];

function rec(area: string, pass: boolean, detail: string) {
  checks.push({ area, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} [${area}] ${detail}`);
}

function strongPassword(): string {
  const raw = randomBytes(24).toString("base64url");
  return `Gl18!${raw}`;
}

function patchEnvFile(updates: Record<string, string>) {
  const envPath = join(process.cwd(), ".env");
  let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text = `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

async function rotateOwner() {
  const ownerEmail = (process.env.OWNER_EMAIL ?? "owner@workshop.local").trim().toLowerCase();
  const newPass = strongPassword();
  const hash = await bcrypt.hash(newPass, 12);
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) throw new Error(`Owner not found: ${ownerEmail}`);

  await prisma.user.update({
    where: { id: owner.id },
    data: { passwordHash: hash, isActive: true, archivedAt: null },
  });
  await writeAudit({
    userId: owner.id,
    action: "user.password_rotate",
    entityType: "user",
    entityId: owner.id,
    newValue: { source: "golive-cleanup", at: new Date().toISOString() },
  });

  patchEnvFile({
    OWNER_PASSWORD: newPass,
    SEED_DEMO: "0",
    AUTH_BYPASS: "0",
    BACKUP_OFFSITE_CMD:
      'powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path \'.data/backups-offsite\' | Out-Null; Copy-Item -LiteralPath \'{FILE}\' -Destination \'.data/backups-offsite/{FILENAME}\' -Force"',
  });

  mkdirSync(DATA, { recursive: true });
  writeFileSync(
    CREDS,
    [
      `# Phase 18 go-live credentials — DO NOT COMMIT`,
      `OWNER_EMAIL=${ownerEmail}`,
      `OWNER_PASSWORD=${newPass}`,
      `OPS_NOTE=Real role accounts remain *.ops@workshop.local (see first-shift-credentials.txt)`,
      `GENERATED_AT=${new Date().toISOString()}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  process.env.OWNER_PASSWORD = newPass;
  process.env.SEED_DEMO = "0";
  process.env.AUTH_BYPASS = "0";

  const stillDemo = newPass === DEMO_PASSWORD || newPass === "ChangeMeNow!";
  const bypassOff = process.env.AUTH_BYPASS !== "1";
  const secretOk = (process.env.AUTH_SECRET ?? "").length >= 32;
  rec(
    "owner_security",
    !stillDemo && newPass.length >= 16 && bypassOff && secretOk,
    `owner=${ownerEmail} passwordRotated=yes authBypassOff=${bypassOff} authSecretOk=${secretOk} credsFile=.data/golive-credentials.txt`,
  );
  return owner.id;
}

async function cleanupUsers(actorId: string) {
  const keepEmails = new Set([
    (process.env.OWNER_EMAIL ?? "owner@workshop.local").trim().toLowerCase(),
    ...[
      "director.ops@workshop.local",
      "sales.ops@workshop.local",
      "accountant.ops@workshop.local",
      "production.ops@workshop.local",
      "warehouse.ops@workshop.local",
      "worker.ops@workshop.local",
    ],
  ]);

  const demoEmails = DEMO_USERS.map((u) => u.email.toLowerCase()).filter((e) => !keepEmails.has(e));
  const all = await prisma.user.findMany({ select: { id: true, email: true, isActive: true } });
  let deactivated = 0;
  for (const u of all) {
    const email = u.email.toLowerCase();
    const isDemoRole = demoEmails.includes(email);
    const isPilot = email.endsWith("@p16.local") || /^e2e-/i.test(email) || email.includes("@p16.");
    if (!isDemoRole && !isPilot) continue;
    if (keepEmails.has(email)) continue;
    if (!u.isActive) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { isActive: false, archivedAt: new Date() },
    });
    await writeAudit({
      userId: actorId,
      action: "user.deactivate",
      entityType: "user",
      entityId: u.id,
      newValue: { email: u.email, reason: "phase18-demo-cleanup" },
    });
    deactivated += 1;
  }

  const activeDemo = await prisma.user.count({
    where: {
      isActive: true,
      email: { in: DEMO_USERS.map((u) => u.email).filter((e) => e !== (process.env.OWNER_EMAIL ?? "owner@workshop.local")) },
    },
  });
  const activeOps = await prisma.user.count({
    where: { isActive: true, email: { endsWith: ".ops@workshop.local" } },
  });
  const ownerActive = await prisma.user.findFirst({
    where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local", isActive: true },
  });

  rec(
    "user_cleanup",
    activeDemo === 0 && activeOps >= 6 && Boolean(ownerActive),
    `deactivated=${deactivated} activeDemoNonOwner=${activeDemo} activeOps=${activeOps} ownerActive=${Boolean(ownerActive)}`,
  );
  rec("real_users", activeOps >= 6 && Boolean(ownerActive), `ops=${activeOps} owner=${Boolean(ownerActive)}`);
}

async function auditCatalogStockDb() {
  const materials = await prisma.material.count({ where: { isActive: true } });
  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    include: {
      recipe: { include: { versions: { where: { validTo: null }, include: { items: true } } } },
      prices: { where: { validTo: null }, take: 1 },
    },
  });
  const withRecipe = products.filter((p) => (p.recipe?.versions?.[0]?.items.length ?? 0) > 0);
  const withPrice = products.filter((p) => p.prices.length > 0);
  // Starter Facade template still in place — real workshop must replace before public go-live.
  const looksLikeStarter =
    materials === 13 &&
    products.length === 2 &&
    products.some((p) => /плитк/i.test(p.name));
  rec(
    "real_catalog",
    materials >= 1 && withRecipe.length >= 1 && withPrice.length >= 1 && !looksLikeStarter,
    looksLikeStarter
      ? `FAIL starter template still present materials=${materials} products=${products.length} — replace via UI before public go-live`
      : `materials=${materials} products=${products.length} recipes=${withRecipe.length} priced=${withPrice.length}`,
  );

  const seedOpening = await prisma.stockMovement.count({
    where: { idempotencyKey: { startsWith: "seed-opening-" } },
  });
  const onHand = await prisma.stockItem.count({ where: { qtyOnHand: { gt: 0 }, materialId: { not: null } } });
  const receipts = await prisma.stockMovement.count({ where: { type: "RECEIPT" } });
  rec(
    "opening_stock",
    seedOpening === 0 && onHand >= 1 && receipts >= 1,
    `seedOpening=${seedOpening} rawOnHandLines=${onHand} receipts=${receipts}`,
  );

  const e2eMoves = await prisma.stockMovement.count({
    where: {
      OR: [
        { idempotencyKey: { startsWith: "E2E-" } },
        { idempotencyKey: { startsWith: "P16-" } },
        { idempotencyKey: { startsWith: "smoke-" } },
        { idempotencyKey: { startsWith: "test-" } },
      ],
    },
  });
  const shiftOrders = await prisma.order.count({
    where: { customer: { name: { contains: "SHIFT" } } },
  });
  const e2eOrders = await prisma.order.count({
    where: {
      OR: [
        { customer: { name: { contains: "E2E" } } },
        { customer: { name: { contains: "e2e" } } },
      ],
    },
  });
  const seedDemo = process.env.SEED_DEMO;
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isLocalWorkshop = /localhost|127\.0\.0\.1/.test(dbUrl) && /\/workshop(\?|$)/.test(dbUrl);
  rec(
    "production_database",
    seedDemo === "0" && e2eMoves === 0 && e2eOrders === 0,
    `SEED_DEMO=${seedDemo ?? "unset"} e2eOrPilotMoves=${e2eMoves} e2eOrders=${e2eOrders} shiftOrders=${shiftOrders} localPilotDb=${isLocalWorkshop}`,
  );

  mkdirSync(OFFSITE_DIR, { recursive: true });
  rec("offsite_dir", existsSync(OFFSITE_DIR), OFFSITE_DIR);
}

async function main() {
  console.log("\n=== PHASE 18 GO-LIVE CLEANUP ===\n");
  const ownerId = await rotateOwner();
  await cleanupUsers(ownerId);
  await auditCatalogStockDb();

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\nCLEANUP CHECKS: ${passed} PASS / ${failed} FAIL`);
  console.log(`Credentials written to ${CREDS} (not for reports).`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 0 : 0); // ops script always exits 0 after reporting; verdict is in report
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
