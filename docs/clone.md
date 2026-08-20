# MASTER → CLONE → CUSTOMIZE → DEPLOY

Workshop ERP is a **standalone clone** product, not multi-tenant SaaS.

```
MASTER (this repo)
   │
   ├── Clone A → Facade Production   (default)
   ├── Clone B → Bakery Production   (proof clone)
   └── Clone C → Furniture / other   (new domain package)
```

Each deployed clone has **its own PostgreSQL database** and `WORKSHOP_DOMAIN`. Core business logic stays generic.

---

## Operational contract

A domain package **must** provide:

| Artifact | Path |
|----------|------|
| Config preset | `src/domains/{slug}/config.ts` |
| i18n overrides | `src/domains/{slug}/i18n-overrides.ts` |
| Help overrides | `src/domains/{slug}/help-overrides.ts` |
| Domain seed | `prisma/seeds/domains/{slug}.ts` |
| Registry entry | `src/domains/registry.ts` |

A domain package **must not**:

- Change `prisma/schema.prisma` or migrations for domain-specific columns
- Add `if (domain === "…")` in `src/core/**` business algorithms
- Import `@/app` or `@/components` from `src/core/**`
- Hardcode Facade units (`M2`, «Фасад», `production_m2`) into Core

Single source of domain metadata: **`src/domains/registry.ts`**.

Runtime adapters (do not duplicate registry maps here):

- `src/core/config/domain-config.ts` — preset + DB settings
- `src/core/config/i18n-domain.ts` — i18n/help merge
- `prisma/seeds/orchestrator.ts` — core → domain → optional demo

---

## Create a new clone

### 1. Scaffold

```powershell
npm run domain:scaffold -- furniture --display "Furniture Production" --category "Мебель" --sale-unit PCS --output-unit PCS --pay-scheme production_pcs
```

`--dry-run` prints files without writing.

### 2. Register

Add one entry to `DOMAIN_REGISTRY` in `src/domains/registry.ts`:

- `preset` from `{SLUG}_DOMAIN_CONFIG`
- `i18n` / `help` from the generated override modules
- `seed.seedModule` = `domains/{slug}`
- `seed.seedExport` = `seed{Pascal}Domain`

Do **not** edit `domain-config.ts` or `i18n-domain.ts` for a new domain.

### 3. Customize

Edit only the domain package:

- warehouse codes / default units / category / pay scheme code
- RU/TJ strings (no Facade м² unless this clone is Facade)
- seed: domain settings + pay scheme; catalog is optional

### 4. Activate

In `.env` of **this clone’s deployment**:

```
WORKSHOP_DOMAIN="furniture"
SEED_DEMO="0"
```

Default when unset: `facade`.

### 5. Seed

```powershell
npm run db:seed:core
npm run db:seed:domain
```

Or full pipeline (`WORKSHOP_DOMAIN` selects the domain seed):

```powershell
npm run db:seed
```

Optional scripts after registration:

- `npm run db:seed:domain:facade`
- `npm run db:seed:domain:bakery`

Set `SEED_DEMO=0` in production so Facade demo history is not loaded.

### 6. Verify

```powershell
$env:WORKSHOP_DOMAIN="furniture"
npm test
```

Facade clone must still pass with `WORKSHOP_DOMAIN=facade` (or unset).

---

## Reference clones

| Domain | Sale unit | Category | Pay scheme | Demo seed |
|--------|-----------|----------|------------|-----------|
| `facade` (default) | M2 | Фасад | `production_m2` | yes |
| `bakery` (proof) | KG | Выпечка | `production_pcs` | no |

Bakery is a **clone-readiness proof**, not a finished bakery product catalog.

---

## Deploy

1. Clone/fork MASTER.
2. Set `WORKSHOP_DOMAIN` and a dedicated `DATABASE_URL`.
3. `npx prisma migrate deploy`
4. Seed core + domain (`SEED_DEMO=0` in production).
5. Deploy the same Next.js app; UI stays generic, copy comes from domain i18n.

---

## Env

| Variable | Role |
|----------|------|
| `WORKSHOP_DOMAIN` | Selects registry preset (default `facade`) |
| `SEED_DEMO` | `0` skips optional demo/history |
| `DATABASE_URL` | This clone’s database only |
