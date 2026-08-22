-- AlterTable
ALTER TABLE "payroll_accruals" ADD COLUMN IF NOT EXISTS "productId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_accruals_productId_idx" ON "payroll_accruals"("productId");

-- AddForeignKey (idempotent: skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_accruals_productId_fkey'
  ) THEN
    ALTER TABLE "payroll_accruals"
      ADD CONSTRAINT "payroll_accruals_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
