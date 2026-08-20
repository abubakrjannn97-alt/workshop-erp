import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("production safety configuration", () => {
  it("backup script uses env-based configuration", async () => {
    const src = await readFile(new URL("../scripts/backup-production.ts", import.meta.url), "utf8");
    assert.match(src, /BACKUP_DATABASE_URL/);
    assert.match(src, /DATABASE_URL/);
    assert.match(src, /BACKUP_DIR/);
    assert.match(src, /BACKUP_DESTINATION/);
    assert.match(src, /BACKUP_RETENTION_DAYS/);
    assert.match(src, /BACKUP_OFFSITE_CMD/);
    assert.doesNotMatch(src, /localhost:5433/);
    assert.doesNotMatch(src, /PGPASSWORD\\s*=\\s*["']workshop["']/);
  });

  it("restore verification never targets production database directly", async () => {
    const src = await readFile(new URL("../scripts/restore-verify.ts", import.meta.url), "utf8");
    assert.match(src, /RESTORE_DATABASE_URL/);
    assert.match(src, /must NOT be the same as DATABASE_URL/);
  });

  it("health endpoint exists and checks DB connectivity", async () => {
    const src = await readFile(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");
    assert.match(src, /SELECT 1/);
    assert.ok(src.includes('status: "ok"'));
    assert.ok(src.includes("503"));
  });

  it("error page masks technical errors in production", async () => {
    const src = await readFile(new URL("../src/app/(app)/error.tsx", import.meta.url), "utf8");
    assert.ok(src.includes('process.env.NODE_ENV === "development" ? error.message : t("error.generic")'));
  });
});

