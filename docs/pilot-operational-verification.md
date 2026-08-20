# Phase 16 — Pilot Operational Verification

Scope: verify GL-1…GL-7 from Phase 15 on a production-like environment.
**No design/CSS/UI/Prisma/business-logic changes** except one proven monitoring bug (GL-1).

## Baseline (start)

| Check | Result |
|-------|--------|
| `npm test` | 125/125 PASS (then 126 after GL-1 regression test) |
| `npm run build` | PASS |
| `npm run e2e` | 50/50 PASS |
| `npm run validate:workshop` | 13/13 PASS |

## GL checklist

### GL-1 — `/api/health` behind auth

| | |
|--|--|
| **Steps** | 1) Unauthenticated `GET /api/health` before fix → login HTML. 2) Exclude `api/health` from middleware matcher. 3) `npx next start -p 3002` with local `DATABASE_URL` + `AUTH_SECRET`. 4) Probe again. |
| **Actual** | After fix: HTTP **200** body `{"status":"ok"}` without login. Also HTTP **503** `{"status":"error","detail":"db unreachable"}` when DB URL invalid — proves route runs, not auth redirect. |
| **Result** | **PASS** (after fix) |
| **Evidence** | `src/middleware.ts` matcher includes `api/health`; live probe on `:3002`; `tests/production-safety.test.ts` asserts matcher exclude |
| **Fix** | Minimal: add `api/health` to middleware negative lookahead (same class as `api/auth`, `api/locale`) |

Regression after fix: `npm test` 126/126, `build` PASS, `e2e` 50/50, `validate:workshop` 13/13.

### GL-2 — Prisma `DATABASE_URL` from `.env`

| | |
|--|--|
| **Steps** | Set shell `DATABASE_URL` to another DB; run `npx prisma migrate deploy`; observe datasource line. |
| **Actual** | Prisma CLI loads `.env` and ignores shell override when `.env` is present. |
| **Result** | **PASS** (ops procedure, not app runtime bug) |
| **Evidence** | Operator must edit `.env` before `node scripts/prod-db-setup.mjs` — documented in `docs/real-workshop-setup.md` |
| **Fix** | None |

### GL-3 — Inventory count + reversal

| | |
|--|--|
| **Steps** | `npx tsx scripts/pilot-gl-verify.ts` — receipt → reverse → adjustToActual → transfer. UI: Owner → `/warehouse/inventory` shows «Начать пересчёт»; `/warehouse/movements` available. |
| **Actual** | Core: reverse→0, adjust→45, transfer→5. UI inventory page loads with warehouse selector + start count. |
| **Result** | **PASS** |
| **Evidence** | `scripts/pilot-gl-verify.ts` GL-3 PASS; browser Owner `/warehouse/inventory` |
| **Fix** | None |

### GL-4 — Extended approvals

| | |
|--|--|
| **Steps** | Verify handlers in `approval-decision.ts`; queue WRITE_OFF via `queueApproval`. UI: `/settings/approvals` as Owner. |
| **Actual** | Handlers present for WRITE_OFF, TRANSFER, INVENTORY, CANCEL_PAID, REFUND, RECIPE, DISCOUNT. Queue creates PENDING request. |
| **Result** | **PASS** |
| **Evidence** | `pilot-gl-verify.ts` GL-4 PASS |
| **Fix** | None |

### GL-5 — Partial customer payment

| | |
|--|--|
| **Steps** | Core: create order total 1000 → pay 400 → status partial debt 600 → pay 600 → paid. UI: `/orders/new` shows buttons «Оплачен / Частично / Оплата потом». Order #1007 COMPLETED with paid 10000/18000 remaining debt UI. |
| **Actual** | Partial → full works; action code has `statusRaw === "partial"` guards; UI exposes partial payment. |
| **Result** | **PASS** |
| **Evidence** | `pilot-gl-verify.ts` GL-5; browser Sales `/orders/new`; order detail debt form |
| **Fix** | None |

### GL-6 — Payroll payout debt cap

| | |
|--|--|
| **Steps** | Accrue 100; reject overpay 150; allow 50; reject 100 after; confirm guard string in `payroll.ts`. |
| **Actual** | Guard `D(amount).gt(debt)` returns error «Долг по начислениям». |
| **Result** | **PASS** |
| **Evidence** | `pilot-gl-verify.ts` GL-6; `src/app/actions/payroll.ts:100-101` |
| **Fix** | None |

### GL-7 — `BACKUP_OFFSITE_CMD`

| | |
|--|--|
| **Steps** | Check env for `BACKUP_OFFSITE_CMD`; confirm backup script supports it. |
| **Actual** | Not set on this host. Script supports `{FILE}`/`{FILENAME}` when configured. |
| **Result** | **PASS** (ops — not a code bug) |
| **Evidence** | `scripts/backup-production.ts`; env audit |
| **Fix** | Operator sets `BACKUP_OFFSITE_CMD` on production host |

## Manual UI walkthrough (Sales → COMPLETED)

| Step | Role | Page / action | Result |
|------|------|---------------|--------|
| Login Sales | sales_manager | Dev quick-login | PASS — home as «Менеджер продаж» |
| New order form | sales | `/orders/new` | PASS — customer, product, qty, price, **Частично**, create |
| Completed list | sales | `/orders?status=COMPLETED` | PASS — 4 completed orders |
| Order detail | sales | Order №1007 | PASS — COMPLETED chain visible; materials; remaining debt payment |
| Login Owner | owner | `/login` | PASS |
| Inventory | owner | `/warehouse/inventory` | PASS — start count UI |
| Finance | owner | `/finance` | PASS — page loads |
| Full transactional chain | — | `npm run e2e` | PASS — 50/50 Sales→Production→Warehouse→Issue→COMPLETED |

**Note:** Creating a brand-new order end-to-end in the browser (click-through all role handoffs) was covered by E2E core chain + page reachability. No UI/server-action bugs blocked the walkthrough.

## Findings

| ID | Severity | Problem | Evidence | Action | Status |
|----|----------|---------|----------|--------|--------|
| GL-1 | P2→fixed | Health behind auth | login HTML vs JSON | Exclude `api/health` from middleware | **FIXED** |
| GL-2 | — | Prisma `.env` precedence | CLI datasource | Ops docs only | **NOT A BUG** |
| GL-3 | — | — | pilot-gl-verify + UI | — | **PASS** |
| GL-4 | — | — | handlers + queue | — | **PASS** |
| GL-5 | — | — | partial pay + UI | — | **PASS** |
| GL-6 | — | — | payout debt guard | — | **PASS** |
| GL-7 | P3 ops | Off-site backup unset | env | Operator config | **NOT A CODE BUG** |
| P16-H1 | P3 | React hydration warnings in `language-switcher` / sidebar (dev overlay) | Browser Next.js issues badge | Post-pilot polish; does not block ops | **OPEN (non-blocker)** |

## What was fixed

- `src/middleware.ts` — exclude `/api/health` from auth matcher
- `tests/production-safety.test.ts` — assert health exclusion
- `scripts/pilot-gl-verify.ts` — reusable GL-3…GL-7 verifier (ops/tooling, not product feature)

## What is not a bug

- Prisma reading `.env` over shell env (CLI behavior)
- Missing `BACKUP_OFFSITE_CMD` until operator configures destination
- Starter catalog / completed order with remaining customer debt (supported partial settlement)
- Dev-only quick-login panel (hidden in production)

## Final regression

| Check | Result |
|-------|--------|
| `npm test` | **126/126 PASS** |
| `npm run build` | **PASS** |
| `npm run e2e` | **50/50 PASS** |
| `npm run validate:workshop` | **13/13 PASS** |
| `npx tsx scripts/pilot-gl-verify.ts` | **6/6 PASS** (GL-2…GL-7) |
| `GET /api/health` (prod-like `:3002`) | **200 `{"status":"ok"}`** |

## Final Verdict

**GO-LIVE READY**

No open P0/P1. Only remaining items are operator ops (off-site backup) and optional post-pilot hydration polish (P3).
