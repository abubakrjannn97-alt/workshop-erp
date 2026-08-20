# Phase 18 — Final Go-Live Cleanup

Scope: operational cleanup for public workshop launch.
**No design/CSS/UI/Prisma/business-logic/server-action/permissions/routes/E2E scenario changes.**

Ops tooling added (not product features): `scripts/golive-cleanup.ts`.

## What was done

| Action | Result |
|--------|--------|
| Rotate `OWNER_PASSWORD` (unique strong) + update owner hash | Done — stored only in `.data/golive-credentials.txt` |
| Set `SEED_DEMO=0`, keep `AUTH_BYPASS=0` | Done in `.env` |
| Configure `BACKUP_OFFSITE_CMD` → `.data/backups-offsite/` | Done |
| Deactivate demo role accounts + P16 pilot users | Done (9 deactivated); kept `owner@` + `*.ops@` |
| Production backup + off-site copy | Done |
| Restore verify to `workshop_restore_verify` (not production) | Done — 19/19 |
| Health 200 + 503 (no secret leak) | Done |
| Controlled multi-role order | Order **#908280** → **COMPLETED** |

## Results table

| Area                 | Result |
| -------------------- | ------ |
| Owner security       | **PASS** |
| Real users           | **PASS** |
| Demo cleanup         | **PASS** |
| Real catalog         | **FAIL** |
| Opening stock        | **PASS** |
| Production DB        | **FAIL** |
| Backup               | **PASS** |
| Off-site backup      | **PASS** |
| Restore verification | **PASS** |
| Health               | **PASS** |
| Permissions          | **PASS** |
| Tests                | **PASS** (126/126) |
| Build                | **PASS** |
| E2E                  | **PASS*** (exit 0; 49 fully_working / 1 bug — see below) |
| Workshop validation  | **PASS** (13/13) |
| Real order           | **PASS** (#908280 COMPLETED, ledger=6, wage=110) |

\*E2E process completed with exit code 0. Entity report: `{ fully_working: 49, bug: 1 }`.

## PASS details

### Owner security — PASS
- Owner password rotated away from demo default; credentials file only under `.data/` (not in report).
- `AUTH_BYPASS=0`, `AUTH_SECRET` length ≥ 32, `SEED_DEMO=0`.

### Demo cleanup / Real users — PASS
- Deactivated: demo role emails (`director@`, `sales@`, …) and `P16-*@p16.local`.
- Active: `owner@workshop.local` + 6 `*.ops@workshop.local` role accounts.
- Roles unchanged.

### Opening stock — PASS
- `seed-opening-*` = **0**
- Stock present via `RECEIPT` movements (not seed).

### Backup / Off-site / Restore — PASS
- Dump: `.data/backups/workshop-2026-08-20T12-04-14.dump` (~0.19 MB)
- Off-site copy: `.data/backups-offsite/workshop-2026-08-20T12-04-14.dump` (same size)
- Restore target: `workshop_restore_verify` @ localhost:5433 — **RESTORE VERIFICATION PASS** (19/19)
- Production DB was **not** overwritten.

### Health — PASS
- `GET http://localhost:3018/api/health` → **200** `{"status":"ok"}`
- Bad DB on `:3019` → **503** `{"status":"error","detail":"db unreachable"}` — no secrets in body

### Real order — PASS
- Multi-role walkthrough via `scripts/first-shift-run.ts`
- Sales → Accountant (partial+full) → Warehouse reserve → Production/Worker → FG → Issue → **COMPLETED**
- Order **#908280**, wage **110**, ledger hits **6**

### Automated — PASS
- `npm test` 126/126
- `npm run build` PASS (10 migrations applied, none pending)
- `npm run validate:workshop` 13/13
- `npm run e2e` exit 0 (see F3)

## FAIL / open issues (ops — not auto-fixed)

### P18-O1 — Real catalog still starter template
| | |
|--|--|
| **Severity** | P1 ops (blocks public go-live of a *real* workshop) |
| **Route** | `/materials`, `/products`, recipes |
| **Role** | Owner / Production |
| **Expected** | Catalog matches actual workshop materials, UoM, prices, BOM, `outputPerBase`, min stock |
| **Actual** | Facade starter template still present (plus E2E-created test materials/products) |
| **Impact** | Wrong norms/prices if used as live production data |
| **Action** | Operator replaces catalog in UI; do **not** invent workshop data in code |

### P18-O2 — Production DB contains pilot/E2E history
| | |
|--|--|
| **Severity** | P1 ops |
| **Expected** | Clean production DB: no E2E/P16/smoke receipts, no test orders |
| **Actual** | Shared `workshop` @ localhost:5433 still has E2E/P16/smoke movements after verification runs |
| **Impact** | Not suitable as the public production ledger of record |
| **Action** | Bootstrap a **dedicated** production database with `node scripts/prod-db-setup.mjs` (`SEED_DEMO=0`), point `DATABASE_URL` there, enter real catalog + Receipt opening stock; keep pilot/E2E on a separate DB |

### P18-E2E-F3 — Low stock notifications (report only)
| | |
|--|--|
| **Severity** | P2 (E2E entity marked `bug`; process still exit 0) |
| **Affected** | Inventory alerts / owner notifications |
| **Role** | Owner |
| **Reproduction** | `npm run e2e` → F3 Low Stock Notifications |
| **Expected** | `refreshOwnerAlerts()` creates `low_stock` notification for material below `minStock` |
| **Actual** | `created=false` (no notification) |
| **Impact** | Owner may not get low-stock alerts |
| **Action** | **Not fixed in Phase 18** (STOP CONDITION). Confirm as runtime bug before any code change. |

## Final security checklist

| Check | Status |
|-------|--------|
| Real owner password (non-demo) | PASS |
| Real employee accounts (`*.ops@`) | PASS |
| Correct roles | PASS |
| No demo role access | PASS |
| `AUTH_BYPASS` disabled | PASS |
| Production secrets configured | PASS (not printed) |
| Health available | PASS |
| Backup configured | PASS |
| Off-site backup configured | PASS |

## Final verdict

**NOT READY**

Software baseline (tests/build/health/backup/restore/security/users/order lifecycle) is strong, but public go-live is blocked until:

1. Starter catalog is replaced with **real workshop** data (operator), and  
2. A **clean production database** is used (no E2E/pilot history).

Optional follow-up (only after confirmation): investigate **P18-E2E-F3** low-stock alerts.

## STOP DEVELOPMENT

No Phase 19 opened. Further changes only for real workshop needs or confirmed runtime bugs after operator completes P18-O1 and P18-O2.
