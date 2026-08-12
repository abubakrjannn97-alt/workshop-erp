CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cash_accounts_code_key" ON "cash_accounts"("code");

CREATE TABLE "financial_funds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "financial_funds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "financial_funds_code_key" ON "financial_funds"("code");

CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fundCode" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");

CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "accountId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "fundId" TEXT,
    "categoryId" TEXT,
    "orderId" TEXT,
    "paymentId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "reversesId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "comment" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ledger_entries_reversesId_key" ON "ledger_entries"("reversesId");
CREATE UNIQUE INDEX "ledger_entries_idempotencyKey_key" ON "ledger_entries"("idempotencyKey");
CREATE INDEX "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");
CREATE INDEX "ledger_entries_fundId_createdAt_idx" ON "ledger_entries"("fundId", "createdAt");
CREATE INDEX "ledger_entries_orderId_idx" ON "ledger_entries"("orderId");
CREATE INDEX "ledger_entries_type_createdAt_idx" ON "ledger_entries"("type", "createdAt");

CREATE TABLE "obligations" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "obligations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "obligations_status_idx" ON "obligations"("status");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
