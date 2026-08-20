# Production Readiness

| Area | Status | Evidence |
|---|---|---|
| Production config | PASS | `npm run build` uses migrations + webpack build; production env guards enabled |
| Database | PASS | Prisma schema and relations verified; migrations deploy cleanly |
| Migrations | PASS | `prisma migrate deploy` reports no pending migrations |
| Backup | PASS | `scripts/backup-production.ts` uses env-driven DB/dir/retention and validates dump file |
| Off-site backup | PASS | `BACKUP_OFFSITE_CMD` supported with `{FILE}`/`{FILENAME}` placeholders |
| Restore | PASS | `scripts/restore-verify.ts` restores to clone DB only (never production directly) |
| Restore verification | PASS | Connectivity + schema + core entity checks + migration checks implemented |
| Health check | PASS | `GET /api/health` returns 200/503 based on DB connectivity |
| Logging | PASS | Structured logging via `pino` (`src/core/infrastructure/logger.ts`) |
| Error handling | PASS | Production error page masks technical error details |
| Permissions | PASS | Existing RBAC unchanged; no weakening applied |
| Audit | PASS | Existing audit trail logic unchanged and active |
| Test-data isolation | PASS | production setup enforces `SEED_DEMO=0`; no seed opening stock on production baseline |
| Workshop validation | PASS | `npm run validate:workshop` checks roles, warehouses, finance, catalog, workflow prerequisites |
| Environment | PASS | production env validation for `AUTH_SECRET`, `DATABASE_URL`, `AUTH_BYPASS` |

