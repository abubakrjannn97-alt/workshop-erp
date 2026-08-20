# Phase 13 — Pre-Pilot Validation

Scope: read-only validation of the ERP as a real workshop system before pilot.
Design, CSS, UI, permissions, and business logic were not changed.

## Baseline (this run)

| Check | Result |
|-------|--------|
| `npm test` | PASS (116/116) |
| `npm run build` | PASS |
| `npm run e2e` | 50/50 PASS |

## Role walkthrough (existing E2E + RBAC)

| Role | Daily job | Status |
|------|-----------|--------|
| Owner | Oversight, approvals, users, finance | WORKING |
| Sales manager | Customer, order, payment, debt | WORKING |
| Production manager | Batches, materials actuals, scrap, FG | WORKING |
| Warehouse manager | Receipt, reserve, transfer, issue, inventory | WORKING |
| Accountant | Payments, expenses, ledger, payroll payout | WORKING |
| Worker | Own batches only | WORKING |

Full order chain verified by E2E: create → confirm/reserve → production → FG → issue → COMPLETED.

## Findings

| ID | Class | Severity | Problem | Proof | Action |
|----|-------|----------|---------|-------|--------|
| PP-1 | GAP | P1 | README published production login with demo password `ChangeMeNow!` | `README.md` Production section | Fixed: production docs now require env credentials; demo password must not be used on live DB |
| PP-2 | GAP | P3 | GitHub workflow title still said “demo data” while script uses `SEED_DEMO=0` | `.github/workflows/seed-production.yml` vs `scripts/prod-db-setup.mjs` | Fixed: renamed to “Seed production baseline” |

### Assessed, not changed

| ID | Class | Why not changed |
|----|-------|-----------------|
| PP-3 | GAP | `typescript.ignoreBuildErrors` remains a known deploy hygiene item; changing it can fail build without a proven runtime bug |
| PP-4 | LIMIT | Off-site backup requires operator to set `BACKUP_OFFSITE_CMD` for the real host — procedure exists, destination is env-specific |
| PP-5 | BY DESIGN | Demo quick-login is gated: `getDemoUsersForLogin()` returns `[]` in production; `devQuickLoginAction` refuses production |

## Verdict

**PRE-PILOT READY** after PP-1/PP-2 documentation/ops corrections.

Operator checklist before first live shift:

1. Set unique `OWNER_PASSWORD` (not demo default)
2. Confirm `AUTH_BYPASS` is absent
3. Run `npm run db:backup` and configure `BACKUP_OFFSITE_CMD`
4. Create users for real roles; do not rely on demo accounts
5. Probe `GET /api/health`
