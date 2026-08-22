-- Workshop multi-tenancy: full data isolation per цех

CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshops_slug_key" ON "workshops"("slug");

CREATE TABLE "user_workshops" (
    "userId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_workshops_pkey" PRIMARY KEY ("userId","workshopId")
);

CREATE INDEX "user_workshops_workshopId_idx" ON "user_workshops"("workshopId");

ALTER TABLE "user_workshops" ADD CONSTRAINT "user_workshops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_workshops" ADD CONSTRAINT "user_workshops_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "workshops" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('ws_default_main', 'Основной цех', 'main', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "user_workshops" ("userId", "workshopId", "createdAt")
SELECT "id", 'ws_default_main', CURRENT_TIMESTAMP FROM "users";

-- Settings: migrate PK to (workshopId, key)
ALTER TABLE "settings" ADD COLUMN "workshopId" TEXT;
UPDATE "settings" SET "workshopId" = 'ws_default_main';
ALTER TABLE "settings" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";
ALTER TABLE "settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("workshopId", "key");
ALTER TABLE "settings" ADD CONSTRAINT "settings_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Helper macro: add workshopId, backfill, add FK + index
-- materials
ALTER TABLE "materials" ADD COLUMN "workshopId" TEXT;
UPDATE "materials" SET "workshopId" = 'ws_default_main';
ALTER TABLE "materials" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "materials_workshopId_idx" ON "materials"("workshopId");
ALTER TABLE "materials" ADD CONSTRAINT "materials_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN "workshopId" TEXT;
UPDATE "products" SET "workshopId" = 'ws_default_main';
ALTER TABLE "products" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "products_workshopId_idx" ON "products"("workshopId");
ALTER TABLE "products" ADD CONSTRAINT "products_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "warehouses" ADD COLUMN "workshopId" TEXT;
UPDATE "warehouses" SET "workshopId" = 'ws_default_main';
ALTER TABLE "warehouses" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "warehouses_code_key";
CREATE UNIQUE INDEX "warehouses_workshopId_code_key" ON "warehouses"("workshopId", "code");
CREATE INDEX "warehouses_workshopId_idx" ON "warehouses"("workshopId");
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suppliers" ADD COLUMN "workshopId" TEXT;
UPDATE "suppliers" SET "workshopId" = 'ws_default_main';
ALTER TABLE "suppliers" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "suppliers_workshopId_idx" ON "suppliers"("workshopId");
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD COLUMN "workshopId" TEXT;
UPDATE "purchase_orders" SET "workshopId" = 'ws_default_main';
ALTER TABLE "purchase_orders" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "purchase_orders_number_key";
CREATE UNIQUE INDEX "purchase_orders_workshopId_number_key" ON "purchase_orders"("workshopId", "number");
CREATE INDEX "purchase_orders_workshopId_idx" ON "purchase_orders"("workshopId");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers" ADD COLUMN "workshopId" TEXT;
UPDATE "customers" SET "workshopId" = 'ws_default_main';
ALTER TABLE "customers" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "customers_workshopId_idx" ON "customers"("workshopId");
ALTER TABLE "customers" ADD CONSTRAINT "customers_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_stages" ADD COLUMN "workshopId" TEXT;
UPDATE "lead_stages" SET "workshopId" = 'ws_default_main';
ALTER TABLE "lead_stages" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "lead_stages_code_key";
CREATE UNIQUE INDEX "lead_stages_workshopId_code_key" ON "lead_stages"("workshopId", "code");
CREATE INDEX "lead_stages_workshopId_idx" ON "lead_stages"("workshopId");
ALTER TABLE "lead_stages" ADD CONSTRAINT "lead_stages_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leads" ADD COLUMN "workshopId" TEXT;
UPDATE "leads" SET "workshopId" = 'ws_default_main';
ALTER TABLE "leads" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "leads_workshopId_idx" ON "leads"("workshopId");
ALTER TABLE "leads" ADD CONSTRAINT "leads_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_statuses" ADD COLUMN "workshopId" TEXT;
UPDATE "order_statuses" SET "workshopId" = 'ws_default_main';
ALTER TABLE "order_statuses" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "order_statuses_code_key";
CREATE UNIQUE INDEX "order_statuses_workshopId_code_key" ON "order_statuses"("workshopId", "code");
CREATE INDEX "order_statuses_workshopId_idx" ON "order_statuses"("workshopId");
ALTER TABLE "order_statuses" ADD CONSTRAINT "order_statuses_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN "workshopId" TEXT;
UPDATE "orders" SET "workshopId" = 'ws_default_main';
ALTER TABLE "orders" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "orders_number_key";
CREATE UNIQUE INDEX "orders_workshopId_number_key" ON "orders"("workshopId", "number");
CREATE INDEX "orders_workshopId_idx" ON "orders"("workshopId");
ALTER TABLE "orders" ADD CONSTRAINT "orders_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_stages" ADD COLUMN "workshopId" TEXT;
UPDATE "production_stages" SET "workshopId" = 'ws_default_main';
ALTER TABLE "production_stages" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "production_stages_code_key";
CREATE UNIQUE INDEX "production_stages_workshopId_code_key" ON "production_stages"("workshopId", "code");
CREATE INDEX "production_stages_workshopId_idx" ON "production_stages"("workshopId");
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_orders" ADD COLUMN "workshopId" TEXT;
UPDATE "production_orders" SET "workshopId" = 'ws_default_main';
ALTER TABLE "production_orders" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "production_orders_workshopId_idx" ON "production_orders"("workshopId");
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_accounts" ADD COLUMN "workshopId" TEXT;
UPDATE "cash_accounts" SET "workshopId" = 'ws_default_main';
ALTER TABLE "cash_accounts" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "cash_accounts_code_key";
CREATE UNIQUE INDEX "cash_accounts_workshopId_code_key" ON "cash_accounts"("workshopId", "code");
CREATE INDEX "cash_accounts_workshopId_idx" ON "cash_accounts"("workshopId");
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_funds" ADD COLUMN "workshopId" TEXT;
UPDATE "financial_funds" SET "workshopId" = 'ws_default_main';
ALTER TABLE "financial_funds" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "financial_funds_code_key";
CREATE UNIQUE INDEX "financial_funds_workshopId_code_key" ON "financial_funds"("workshopId", "code");
CREATE INDEX "financial_funds_workshopId_idx" ON "financial_funds"("workshopId");
ALTER TABLE "financial_funds" ADD CONSTRAINT "financial_funds_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_categories" ADD COLUMN "workshopId" TEXT;
UPDATE "expense_categories" SET "workshopId" = 'ws_default_main';
ALTER TABLE "expense_categories" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "expense_categories_code_key";
CREATE UNIQUE INDEX "expense_categories_workshopId_code_key" ON "expense_categories"("workshopId", "code");
CREATE INDEX "expense_categories_workshopId_idx" ON "expense_categories"("workshopId");
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ledger_entries" ADD COLUMN "workshopId" TEXT;
UPDATE "ledger_entries" SET "workshopId" = 'ws_default_main';
ALTER TABLE "ledger_entries" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "ledger_entries_workshopId_idx" ON "ledger_entries"("workshopId");
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "obligations" ADD COLUMN "workshopId" TEXT;
UPDATE "obligations" SET "workshopId" = 'ws_default_main';
ALTER TABLE "obligations" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "obligations_workshopId_idx" ON "obligations"("workshopId");
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pay_schemes" ADD COLUMN "workshopId" TEXT;
UPDATE "pay_schemes" SET "workshopId" = 'ws_default_main';
ALTER TABLE "pay_schemes" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "pay_schemes_code_key";
CREATE UNIQUE INDEX "pay_schemes_workshopId_code_key" ON "pay_schemes"("workshopId", "code");
CREATE INDEX "pay_schemes_workshopId_idx" ON "pay_schemes"("workshopId");
ALTER TABLE "pay_schemes" ADD CONSTRAINT "pay_schemes_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_accruals" ADD COLUMN "workshopId" TEXT;
UPDATE "payroll_accruals" SET "workshopId" = 'ws_default_main';
ALTER TABLE "payroll_accruals" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "payroll_accruals_workshopId_idx" ON "payroll_accruals"("workshopId");
ALTER TABLE "payroll_accruals" ADD CONSTRAINT "payroll_accruals_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_payouts" ADD COLUMN "workshopId" TEXT;
UPDATE "payroll_payouts" SET "workshopId" = 'ws_default_main';
ALTER TABLE "payroll_payouts" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "payroll_payouts_workshopId_idx" ON "payroll_payouts"("workshopId");
ALTER TABLE "payroll_payouts" ADD CONSTRAINT "payroll_payouts_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_requests" ADD COLUMN "workshopId" TEXT;
UPDATE "approval_requests" SET "workshopId" = 'ws_default_main';
ALTER TABLE "approval_requests" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "approval_requests_workshopId_idx" ON "approval_requests"("workshopId");
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD COLUMN "workshopId" TEXT;
UPDATE "notifications" SET "workshopId" = 'ws_default_main';
ALTER TABLE "notifications" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "notifications_workshopId_idx" ON "notifications"("workshopId");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_shifts" ADD COLUMN "workshopId" TEXT;
UPDATE "cash_shifts" SET "workshopId" = 'ws_default_main';
ALTER TABLE "cash_shifts" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX "cash_shifts_workshopId_idx" ON "cash_shifts"("workshopId");
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounting_periods" ADD COLUMN "workshopId" TEXT;
UPDATE "accounting_periods" SET "workshopId" = 'ws_default_main';
ALTER TABLE "accounting_periods" ALTER COLUMN "workshopId" SET NOT NULL;
DROP INDEX IF EXISTS "accounting_periods_year_month_key";
CREATE UNIQUE INDEX "accounting_periods_workshopId_year_month_key" ON "accounting_periods"("workshopId", "year", "month");
CREATE INDEX "accounting_periods_workshopId_idx" ON "accounting_periods"("workshopId");
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
