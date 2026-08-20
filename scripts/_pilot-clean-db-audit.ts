import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnvFiles } from "./load-env";

loadLocalEnvFiles();

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const u = new URL(baseUrl);
const pilotDb = "workshop_pilot_clean";
const pilotUrl = new URL(baseUrl);
pilotUrl.pathname = `/${pilotDb}`;

const psqlBin =
  process.env.RESTORE_PSQL_PATH?.trim() ||
  (existsSync("C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe")
    ? "\"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe\""
    : "psql");

function psql(db: string, sql: string): string {
  const env = { ...process.env, PGPASSWORD: u.password };
  return execSync(
    `${psqlBin} -h ${u.hostname} -p ${u.port || "5432"} -U ${u.username} -d ${db} -t -A -c "${sql}"`,
    { env, encoding: "utf8" },
  ).trim();
}

psql("postgres", `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${pilotDb}' AND pid <> pg_backend_pid()`);
psql("postgres", `DROP DATABASE IF EXISTS ${pilotDb}`);
psql("postgres", `CREATE DATABASE ${pilotDb}`);
console.log(`Created fresh DB: ${pilotDb}`);

const envPath = ".env";
const envBackup = readFileSync(envPath, "utf8");
const pilotUrlStr = pilotUrl.toString();
const patchedEnv = envBackup.replace(
  /^DATABASE_URL=.*$/m,
  `DATABASE_URL="${pilotUrlStr}"`,
);
writeFileSync(envPath, patchedEnv, "utf8");

const pilotEnv = {
  ...process.env,
  DATABASE_URL: pilotUrlStr,
  NODE_ENV: "production",
  OWNER_PASSWORD: "PilotGoLive2026!Secure",
  SEED_DEMO: "0",
};

try {
  execSync("node scripts/prod-db-setup.mjs", { stdio: "inherit", env: pilotEnv });
  execSync("npx tsx scripts/validate-workshop-setup.ts", { stdio: "inherit", env: pilotEnv });
} finally {
  writeFileSync(envPath, envBackup, "utf8");
  console.log("Restored .env DATABASE_URL");
}

const prisma = new PrismaClient({ datasources: { db: { url: pilotUrlStr } } });

async function audit() {
  const owner = await prisma.user.findFirst({ where: { role: { code: "owner" } }, include: { role: true } });
  const auditResult = {
    seedOpeningStock: await prisma.stockMovement.count({
      where: { idempotencyKey: { startsWith: "seed-opening-" } },
    }),
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    payments: await prisma.payment.count(),
    productionBatches: await prisma.productionBatch.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    auditLogs: await prisma.auditLog.count(),
    users: await prisma.user.count(),
    ownerEmail: owner?.email ?? null,
    materials: await prisma.material.count(),
    products: await prisma.product.count(),
    stockOnHand: await prisma.stockItem.count({ where: { qtyOnHand: { gt: 0 } } }),
  };
  console.log("\nPILOT CLEAN DB AUDIT:");
  console.log(JSON.stringify(auditResult, null, 2));
  await prisma.$disconnect();
}

audit().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
