-- Add workshopId to operational child tables and backfill from parents.
-- Existing business data stays on the parent workshop (Цех 1 for historical rows).

-- stock_items
ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "stock_items" si
SET "workshopId" = w."workshopId"
FROM "warehouses" w
WHERE si."warehouseId" = w."id" AND si."workshopId" IS NULL;
UPDATE "stock_items" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "stock_items" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "stock_items_workshopId_idx" ON "stock_items"("workshopId");
DO $$ BEGIN
  ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- stock_movements
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "stock_movements" sm
SET "workshopId" = w."workshopId"
FROM "warehouses" w
WHERE sm."warehouseId" = w."id" AND sm."workshopId" IS NULL;
UPDATE "stock_movements" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "stock_movements_workshopId_idx" ON "stock_movements"("workshopId");
DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- purchase_payments
ALTER TABLE "purchase_payments" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "purchase_payments" pp
SET "workshopId" = po."workshopId"
FROM "purchase_orders" po
WHERE pp."purchaseOrderId" = po."id" AND pp."workshopId" IS NULL;
UPDATE "purchase_payments" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "purchase_payments" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "purchase_payments_workshopId_idx" ON "purchase_payments"("workshopId");
DO $$ BEGIN
  ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- inventory_counts
ALTER TABLE "inventory_counts" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "inventory_counts" ic
SET "workshopId" = w."workshopId"
FROM "warehouses" w
WHERE ic."warehouseId" = w."id" AND ic."workshopId" IS NULL;
UPDATE "inventory_counts" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "inventory_counts" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "inventory_counts_workshopId_idx" ON "inventory_counts"("workshopId");
DO $$ BEGIN
  ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- crm_documents
ALTER TABLE "crm_documents" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "crm_documents" d
SET "workshopId" = l."workshopId"
FROM "leads" l
WHERE d."leadId" = l."id" AND d."workshopId" IS NULL;
UPDATE "crm_documents" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "crm_documents" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "crm_documents_workshopId_idx" ON "crm_documents"("workshopId");
DO $$ BEGIN
  ALTER TABLE "crm_documents" ADD CONSTRAINT "crm_documents_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "payments" p
SET "workshopId" = o."workshopId"
FROM "orders" o
WHERE p."orderId" = o."id" AND p."workshopId" IS NULL;
UPDATE "payments" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "payments_workshopId_idx" ON "payments"("workshopId");
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- production_batches
ALTER TABLE "production_batches" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "production_batches" b
SET "workshopId" = po."workshopId"
FROM "production_orders" po
WHERE b."productionOrderId" = po."id" AND b."workshopId" IS NULL;
UPDATE "production_batches" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "production_batches" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "production_batches_workshopId_idx" ON "production_batches"("workshopId");
DO $$ BEGIN
  ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- scrap_records
ALTER TABLE "scrap_records" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
UPDATE "scrap_records" s
SET "workshopId" = b."workshopId"
FROM "production_batches" b
WHERE s."batchId" = b."id" AND s."workshopId" IS NULL;
UPDATE "scrap_records" SET "workshopId" = 'ws_default_main' WHERE "workshopId" IS NULL;
ALTER TABLE "scrap_records" ALTER COLUMN "workshopId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "scrap_records_workshopId_idx" ON "scrap_records"("workshopId");
DO $$ BEGIN
  ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_workshopId_fkey"
    FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure Цех 2 exists and has structure only (no business data copied).
INSERT INTO "workshops" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('ws_workshop_2', 'Цех 2', 'ceh-2', true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = 'Цех 2', "slug" = 'ceh-2', "isActive" = true, "updatedAt" = NOW();
