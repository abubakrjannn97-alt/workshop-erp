/**
 * Production-grade backup script.
 * Uses DATABASE_URL or BACKUP_DATABASE_URL for connection.
 * Stores backups in BACKUP_DIR (default: .data/backups).
 * Supports off-site copy via BACKUP_OFFSITE_CMD.
 *
 * Usage: npx tsx scripts/backup-production.ts
 * ENV:
 *   BACKUP_DATABASE_URL or DATABASE_URL — PostgreSQL connection string
 *   BACKUP_DIR — local backup directory (default: .data/backups)
 *   BACKUP_RETENTION_DAYS — days to keep old backups (default: 14)
 *   BACKUP_OFFSITE_CMD — optional command to copy backup off-site
 */
import { execSync } from "node:child_process";
import { mkdirSync, statSync, readdirSync, unlinkSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";

function env(key: string, fallback?: string): string {
  const val = process.env[key]?.trim();
  if (val) return val;
  if (fallback !== undefined) return fallback;
  console.error(`FATAL: Missing required env var ${key}`);
  process.exit(1);
}

function parseConnectionUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

const dbUrl = env("BACKUP_DATABASE_URL", process.env.DATABASE_URL ?? "");
if (!dbUrl) { console.error("FATAL: No DATABASE_URL or BACKUP_DATABASE_URL set."); process.exit(1); }

const conn = parseConnectionUrl(dbUrl);
const backupDir = resolve(env("BACKUP_DIR", join(process.cwd(), ".data", "backups")));
const retentionDays = parseInt(env("BACKUP_RETENTION_DAYS", "14"), 10);
const offsiteCmd = process.env.BACKUP_OFFSITE_CMD?.trim() || null;

mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const filename = `workshop-${stamp}.dump`;
const filepath = join(backupDir, filename);
const journalPath = join(backupDir, "journal.jsonl");

let ok = false;
let errorMsg = "";
let fileSize = 0;

try {
  const pgEnv = { ...process.env, PGPASSWORD: conn.password };
  execSync(
    `pg_dump -h ${conn.host} -p ${conn.port} -U ${conn.user} -Fc -f "${filepath}" ${conn.database}`,
    { env: pgEnv, stdio: "pipe" },
  );

  const stat = statSync(filepath);
  fileSize = stat.size;
  if (fileSize < 1024) {
    throw new Error(`Backup file too small (${fileSize} bytes), likely empty or corrupt.`);
  }

  ok = true;
  console.log(`BACKUP OK: ${filepath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  if (offsiteCmd) {
    console.log(`OFF-SITE: ${offsiteCmd}`);
    execSync(offsiteCmd.replace("{FILE}", filepath).replace("{FILENAME}", filename), { stdio: "inherit" });
    console.log("OFF-SITE OK");
  }
} catch (err) {
  errorMsg = err instanceof Error ? err.message : String(err);
  console.error(`BACKUP FAILED: ${errorMsg}`);
}

// Retention: remove old backups
try {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  for (const f of readdirSync(backupDir).filter((n) => n.endsWith(".dump"))) {
    const fp = join(backupDir, f);
    const st = statSync(fp);
    if (st.mtimeMs < cutoff) {
      unlinkSync(fp);
      console.log(`PURGED: ${f}`);
    }
  }
} catch {}

// Journal
const entry = JSON.stringify({
  at: new Date().toISOString(),
  file: filepath,
  ok,
  error: errorMsg || null,
  size: fileSize,
});
appendFileSync(journalPath, entry + "\n", "utf8");

process.exit(ok ? 0 : 1);
