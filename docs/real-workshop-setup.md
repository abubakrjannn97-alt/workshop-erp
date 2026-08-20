# Phase 14 — Real Workshop Setup

Scope: prepare the Facade Production clone for real workshop data without changing design, CSS, UI, or business logic.

## Baseline (this run)

| Check | Result |
|-------|--------|
| `npm test` | PASS (120/120) |
| `npm run build` | PASS |
| `npm run e2e` | 50/50 PASS |
| `npm run validate:workshop` | Run after production bootstrap (see below) |

## Findings

| ID | Class | Severity | Problem | Action |
|----|-------|----------|---------|--------|
| RW-1 | GAP | P1 | Production bootstrap (`SEED_DEMO=0`) still injected fake opening stock (2000 kg cement, etc.) | Fixed: `seedFacadeOpeningStock` runs only when `SEED_DEMO !== "0"` |
| RW-2 | GAP | P2 | No automated post-bootstrap checklist for roles/warehouses/finance/catalog | Fixed: `npm run validate:workshop` |
| RW-3 | BY DESIGN | — | Domain seed still creates starter materials/products/recipes as templates | Operator replaces or edits via UI before go-live |

### Assessed, not changed

| ID | Why not changed |
|----|-----------------|
| RW-4 | Starter catalog names/prices are domain templates — clearing them would break empty-state onboarding; real workshop edits catalog in place |
| RW-5 | Demo users remain in DB only when `SEED_DEMO=1`; production bootstrap skips demo history |
| RW-6 | Full operational workflow already verified by 50 E2E scenarios (Phase 11) |

## Production bootstrap

On a **new** production database:

```powershell
# .env — required for production seed
$env:NODE_ENV = "production"
$env:OWNER_PASSWORD = "<strong-unique-password>"
$env:AUTH_SECRET = "<32+ chars>"
$env:DATABASE_URL = "postgresql://..."
$env:WORKSHOP_DOMAIN = "facade"

node scripts/prod-db-setup.mjs
npm run validate:workshop
```

What `prod-db-setup.mjs` applies:

1. `prisma migrate deploy`
2. Core seed: 8 roles, permissions, units, RAW/FG warehouses, CASH/BANK, funds, expense categories, lead/order statuses, production stages, owner account
3. Facade domain seed: domain settings, payroll scheme, **starter catalog** (materials, products, recipes)
4. **No** demo history, **no** seed opening stock, **no** demo customers/orders

## Operator checklist (real workshop go-live)

### 1. Environment

- [ ] `NODE_ENV=production`
- [ ] `AUTH_SECRET` ≥ 32 characters
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `AUTH_BYPASS` is **absent**
- [ ] `OWNER_PASSWORD` set and **not** the demo default
- [ ] `WORKSHOP_DOMAIN=facade` (or your clone domain)
- [ ] `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, optional `BACKUP_OFFSITE_CMD`

### 2. Database bootstrap

```powershell
node scripts/prod-db-setup.mjs
npm run validate:workshop
curl http://localhost:3000/api/health
```

Expected `validate:workshop` checks:

| Area | Expected |
|------|----------|
| Roles | 8 system roles (owner … accountant) |
| Warehouses | RAW (material) + FG (finished) |
| Finance | CASH + BANK accounts, 5 allocation funds |
| Domain | Settings match `WORKSHOP_DOMAIN` preset |
| Catalog | ≥1 material, ≥1 product with active recipe |
| Inventory | **0** seed opening-stock movements |

### 3. Replace starter catalog with real data

Domain seed creates **templates** — review and update before first shift:

| Screen | Action |
|--------|--------|
| Materials | Replace demo names/prices with real suppliers and package prices |
| Products | Set real sale prices, min prices, output per base |
| Recipes | Enter actual norms per m² (or your sale unit) |
| Settings → Units | Confirm KG, M2, PCS, G, BUCKET match your shop |

### 4. Enter real opening balances

After catalog is correct:

1. Warehouse → Receipt — post **actual** raw material on hand
2. Finance → record any starting CASH/BANK balances via owner adjustment (if applicable)

Do **not** rely on seed opening stock on production — it is disabled for `SEED_DEMO=0`.

### 5. Create real users

Settings → Users — one account per role actually used:

| Role | Typical user |
|------|--------------|
| Owner | Business owner |
| Sales manager | CRM + orders |
| Production manager | Batches, scrap |
| Warehouse manager | Receipt, issue, inventory |
| Accountant | Payments, expenses, payroll payout |
| Worker(s) | Shop floor (own batches only) |

Remove or disable unused demo accounts if any exist from prior dev seeds.

### 6. Operational workflow (verified by E2E)

End-to-end chain supported without code changes:

```
Customer → Lead/Quote → Order → Payment/Confirm → Reserve materials
  → Production batch → Material issue → FG receipt → Client issue → COMPLETED
```

Parallel paths: Purchase order receipt, expenses, payroll accrual, seller commission, approvals.

### 7. Backup before first live shift

```powershell
npm run db:backup
```

See [production-backup.md](./production-backup.md).

## Verdict

**REAL WORKSHOP READY** after:

1. Production bootstrap on clean DB (`SEED_DEMO=0`)
2. `npm run validate:workshop` PASS
3. Operator replaces starter catalog and enters real opening stock via UI
4. Real users created per role

## Related docs

- [pre-pilot-validation.md](./pre-pilot-validation.md) — env safety, RBAC walkthrough
- [production-readiness.md](./production-readiness.md) — backup, health, logging
- [clone.md](./clone.md) — domain package contract
