ALTER TABLE "users" ADD COLUMN "hiredAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "paySchemeId" TEXT;

CREATE TABLE "pay_schemes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "salaryAmount" DECIMAL(18,4),
    "productionRate" DECIMAL(18,4),
    "commissionMode" TEXT,
    "commissionBase" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pay_schemes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pay_schemes_code_key" ON "pay_schemes"("code");

CREATE TABLE "commission_tiers" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "fromCount" INTEGER NOT NULL,
    "toCount" INTEGER,
    "percent" DECIMAL(18,4) NOT NULL,
    CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "commission_tiers_schemeId_fromCount_idx" ON "commission_tiers"("schemeId", "fromCount");

CREATE TABLE "payroll_accruals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "quantity" DECIMAL(18,6),
    "percent" DECIMAL(18,4),
    "orderId" TEXT,
    "batchId" TEXT,
    "paymentId" TEXT,
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACCRUED',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_accruals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_accruals_userId_periodKey_idx" ON "payroll_accruals"("userId", "periodKey");
CREATE INDEX "payroll_accruals_paymentId_idx" ON "payroll_accruals"("paymentId");
CREATE INDEX "payroll_accruals_batchId_idx" ON "payroll_accruals"("batchId");

CREATE TABLE "payroll_payouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "accountId" TEXT,
    "periodKey" TEXT NOT NULL,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_payouts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_payouts_userId_periodKey_idx" ON "payroll_payouts"("userId", "periodKey");

ALTER TABLE "users" ADD CONSTRAINT "users_paySchemeId_fkey" FOREIGN KEY ("paySchemeId") REFERENCES "pay_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commission_tiers" ADD CONSTRAINT "commission_tiers_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "pay_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_accruals" ADD CONSTRAINT "payroll_accruals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_payouts" ADD CONSTRAINT "payroll_payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
