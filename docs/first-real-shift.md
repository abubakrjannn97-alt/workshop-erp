# Phase 17 — First Real Workshop Shift

Scope: operational first-shift walkthrough on the current production-like database.
**No product code, design, CSS, UI, Prisma, server actions, permissions, routes, or E2E changes.**

Runner: `npx tsx scripts/first-shift-run.ts`  
Credentials (gitignored): `.data/first-shift-credentials.txt`

## Baseline (unchanged)

| Check | Result |
|-------|--------|
| `npm test` | 126/126 PASS (prior baseline; not re-run this phase) |
| `npm run build` | PASS (prior) |
| `npm run e2e` | 50/50 PASS (prior) |
| `npm run validate:workshop` | 13/13 PASS (prior) |
| P0 / P1 | 0 |

## 1. Production environment

| Check | Result | Evidence |
|-------|--------|----------|
| `DATABASE_URL` | **PASS** | Set in `.env` (local Postgres `localhost:5433` / `workshop`) |
| `NODE_ENV=production` | **PASS** | Health probe process ran with `NODE_ENV=production` (`npx next start -p 3017`) |
| `SEED_DEMO=0` | **PASS** | Unset in `.env` (treated as non-demo; seed opening skipped when `SEED_DEMO=0`) |
| Unique `OWNER_PASSWORD` | **FAIL** | Still demo default (`ChangeMeNow!`) — rotate on live host |
| `AUTH_BYPASS` off | **PASS** | `AUTH_BYPASS=0` |
| `AUTH_SECRET` set | **PASS** | Length ≥ 32 |
| `GET /api/health` | **PASS** | HTTP **200** body `{"status":"ok"}` on `:3017` |

## 2. Real users

| Role | Account | Result |
|------|---------|--------|
| Owner/Director | `director.ops@workshop.local` | **PASS** |
| Sales | `sales.ops@workshop.local` | **PASS** |
| Accountant | `accountant.ops@workshop.local` | **PASS** |
| Production Manager | `production.ops@workshop.local` | **PASS** |
| Warehouse Manager | `warehouse.ops@workshop.local` | **PASS** |
| Worker | `worker.ops@workshop.local` | **PASS** |

Non-demo emails (`*.ops@workshop.local`). Shift password stored only under `.data/`.  
Note: legacy demo accounts still exist in DB (`legacyDemoAccountsInDb=7`) — disable on the live host; shift did **not** use them.

## 3. Real catalog

| Check | Result |
|-------|--------|
| Materials present + UoM | **PASS** — 13 active materials (Facade starter) |
| Products + prices | **PASS** — 2 products with current prices |
| Recipes / BOM | **PASS** — 1 product with active recipe |
| `outputPerBase` | **PASS** — tile `outputPerBase=10` |

**Ops note:** Starter Facade catalog is a **template**. Operator must replace names, UoM, prices, and BOM with real workshop data before public go-live. Not a runtime bug.

## 4. Opening stock

| Check | Result | Evidence |
|-------|--------|----------|
| Not from `seed-opening-*` | **PASS** | `seedOpeningMoves=0` |
| On-hand via `RECEIPT` | **PASS** | 22 RECEIPT movements; RAW lines with qty/available/reserved |
| Fresh first-shift receipts | **N/A** | `postedNew=0` — on-hand already &gt; 0 from prior RECEIPT (supplier / E2E / P16 pilot) |

Sample RAW balances after shift (post-operations): cement/sand etc. with `qtyOnHand` and `qtyReserved` populated.

## 5. Backup

| Check | Result | Evidence |
|-------|--------|----------|
| Production backup | **PASS** | `npm run db:backup` |
| Backup file created | **PASS** | `.data/backups/workshop-2026-08-20T11-26-55.dump` (0.19 MB) |
| Timestamp | **PASS** | **2026-08-20T11:26:55Z** (file `11-26-55`) |
| Off-site copy | **FAIL** (ops) | `BACKUP_OFFSITE_CMD` unset — script supports `{FILE}`/`{FILENAME}` when configured |

## 6–7. Real order walkthrough (multi-role)

Run id: `SHIFT17-mt1fr2dr` · Order **#908277** · Status **COMPLETED**

| Step | Role | Result |
|------|------|--------|
| Customer + Order + Product | Sales (`sales.ops`) | **PASS** — total 750 |
| Partial payment | Accountant | **PASS** — paid 375 / `partial` |
| Full payment | Accountant | **PASS** — paid 750 |
| Material reservation | Warehouse | **PASS** — 4 RESERVE moves |
| Production batch + worker | Production + Worker | **PASS** |
| Planned → actual + scrap | Production | **PASS** — scrap=1 |
| Batch close → FG | Production | **PASS** — FG on hand ≥ good qty |
| Issue to customer → COMPLETED | Warehouse | **PASS** |
| Finance / ledger | Accountant (via payments) | **PASS** — **6** ledger rows (`CASH_IN`, `FUND_IN`) for order |
| Employee wage | Worker accrual | **PASS** — wage **110** |

Roles used: Sales, Accountant, Warehouse, Production, Worker (not Owner-only).

## Operational result

| Area | Result |
|------|--------|
| Production environment | **PASS** (with owner-password ops fail) |
| Real users | **PASS** |
| Real catalog | **PASS** (template — operator replace) |
| Opening stock | **PASS** (receipt-based; no seed-opening) |
| Backup | **PASS** local / **FAIL** off-site (ops) |
| Sales | **PASS** |
| Production | **PASS** |
| Warehouse | **PASS** |
| Finance | **PASS** |
| Employees | **PASS** |
| Full order lifecycle | **PASS** |

## Bugs

**No product runtime bugs found** in this shift.

### Ops issues (not code bugs)

| ID | Severity | Issue | Action |
|----|----------|-------|--------|
| P17-O1 | P2 ops | `OWNER_PASSWORD` still demo default | Rotate unique password on live host; re-seed owner or update user |
| P17-O2 | P3 ops | `BACKUP_OFFSITE_CMD` unset | Configure off-site copy on production |
| P17-O3 | P3 ops | Legacy demo users still active (7) | Deactivate after ops accounts verified |
| P17-O4 | P3 ops | Catalog still Facade starter template | Replace with real workshop materials/products/BOM/prices |
| P17-O5 | P3 ops | Shared pilot DB contains E2E/P16 RECEIPT history | Prefer clean DB + Warehouse Receipt for true first opening stock |

## Final verdict

**GO-LIVE WITH MINOR ISSUES**

Full multi-role order lifecycle completed successfully (Customer → … → COMPLETED → ledger + wage).  
Blockers for *public* go-live are operational: rotate owner password, configure off-site backup, replace starter catalog, disable legacy demo accounts. No P0/P1 product defects discovered; no speculative code fixes applied.
