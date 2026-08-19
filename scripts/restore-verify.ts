/**
 * Restore a backup to a SEPARATE verification database,
 * then run integrity checks. Never touches production.
 *
 * Usage: npx tsx scripts/restore-verify.ts <dump-file>
 * ENV:
 *   RESTORE_DATABASE_URL — connection for the clone/verification DB
 *                          (MUST NOT be production!)
 *   DATABASE_URL — used only to extract pg credentials if RESTORE not set
 */
import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const dumpFile = process.argv[2];
if (!dumpFile) {
  console.error("Usage: npx tsx scripts/restore-verify.ts <path-to-dump>");
  process.exit(1);
}

try { statSync(dumpFile); } catch {
  console.error(`File not found: ${dumpFile}`);
  process.exit(1);
}

const restoreUrl = process.env.RESTORE_DATABASE_URL;
if (!restoreUrl) {
  console.error("FATAL: RESTORE_DATABASE_URL must be set (verification database, NOT production).");
  process.exit(1);
}

if (restoreUrl === process.env.DATABASE_URL) {
  console.error("FATAL: RESTORE_DATABASE_URL must NOT be the same as DATABASE_URL (production safety).");
  process.exit(1);
}

function parseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

const conn = parseUrl(restoreUrl);
const pgEnv = { ...process.env, PGPASSWORD: conn.password };
const psqlBin =
  process.env.RESTORE_PSQL_PATH?.trim() ||
  (existsSync("C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe")
    ? "\"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe\""
    : "psql");
const pgRestoreBin =
  process.env.RESTORE_PG_RESTORE_PATH?.trim() ||
  (existsSync("C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe")
    ? "\"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe\""
    : "pg_restore");

function psql(sql: string): string {
  return execSync(
    `${psqlBin} -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -t -A -c "${sql}"`,
    { env: pgEnv, encoding: "utf8" },
  ).trim();
}

const checks: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, fn: () => string) {
  try {
    const detail = fn();
    checks.push({ name, pass: true, detail });
    console.log(`✓ ${name}: ${detail}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    checks.push({ name, pass: false, detail });
    console.error(`✗ ${name}: ${detail}`);
  }
}

// 1. Restore
console.log(`\n→ Restoring ${dumpFile} to ${conn.database}@${conn.host}:${conn.port}...`);
try {
  execSync(
    `${pgRestoreBin} -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} --clean --if-exists "${dumpFile}"`,
    { env: pgEnv, stdio: "pipe" },
  );
  console.log("  Restore complete.\n");
} catch (err) {
  // pg_restore often exits non-zero for benign warnings
  console.log("  Restore finished (with warnings).\n");
}

// 2. Connectivity
check("Database connectivity", () => {
  const result = psql("SELECT 1");
  if (result !== "1") throw new Error(`Expected 1, got ${result}`);
  return "OK";
});

// 3. Schema check — core tables
const requiredTables = [
  "users", "roles", "permissions", "customers", "orders", "order_items",
  "production_orders", "production_batches", "materials", "stock_items",
  "stock_movements", "payments", "ledger_entries", "cash_accounts",
  "financial_funds", "purchase_orders", "purchase_items", "audit_logs",
  "notifications", "cash_shifts", "warehouses",
];

check("Schema — required tables", () => {
  const existing = psql(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'"
  ).split("\n").map((s) => s.trim());
  const missing = requiredTables.filter((t) => !existing.includes(t));
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(", ")}`);
  return `${requiredTables.length} tables verified`;
});

// 4. Core data checks
check("Users exist", () => {
  const count = psql("SELECT count(*) FROM users");
  if (parseInt(count) < 1) throw new Error("No users");
  return `${count} users`;
});

check("Roles exist", () => {
  const count = psql("SELECT count(*) FROM roles");
  if (parseInt(count) < 7) throw new Error(`Only ${count} roles, expected ≥7`);
  return `${count} roles`;
});

check("Owner account exists", () => {
  const email = psql("SELECT email FROM users WHERE email LIKE '%owner@%' LIMIT 1");
  if (!email) throw new Error("No owner user");
  return email;
});

check("Customers", () => psql("SELECT count(*) FROM customers") + " rows");
check("Orders", () => psql("SELECT count(*) FROM orders") + " rows");
check("Order items", () => psql("SELECT count(*) FROM order_items") + " rows");
check("Materials", () => psql("SELECT count(*) FROM materials") + " rows");
check("Stock items", () => psql("SELECT count(*) FROM stock_items") + " rows");
check("Stock movements", () => psql("SELECT count(*) FROM stock_movements") + " rows");
check("Payments", () => psql("SELECT count(*) FROM payments") + " rows");
check("Ledger entries", () => psql("SELECT count(*) FROM ledger_entries") + " rows");
check("Production orders", () => psql("SELECT count(*) FROM production_orders") + " rows");
check("Production batches", () => psql("SELECT count(*) FROM production_batches") + " rows");
check("Audit logs", () => psql("SELECT count(*) FROM audit_logs") + " rows");
check("Warehouses", () => {
  const count = psql("SELECT count(*) FROM warehouses");
  if (parseInt(count) < 2) throw new Error("Expected at least RAW + FG warehouses");
  return `${count} warehouses`;
});

// 5. Prisma migration check
check("Prisma migrations applied", () => {
  const count = psql("SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL");
  if (parseInt(count) < 10) throw new Error(`Only ${count} migrations`);
  return `${count} migrations`;
});

// Summary
console.log("\n" + "=".repeat(50));
const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;
console.log(`RESTORE VERIFICATION: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) {
  console.error("\nFAILED CHECKS:");
  for (const c of checks.filter((ch) => !ch.pass)) {
    console.error(`  ✗ ${c.name}: ${c.detail}`);
  }
  process.exit(1);
} else {
  console.log("\nRESTORE VERIFICATION PASS");
  process.exit(0);
}
