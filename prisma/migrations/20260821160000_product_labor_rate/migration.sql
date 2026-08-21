-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "laborRate" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- Carry over former global worker rate (~22 с/м²) so existing products keep paying workers.
UPDATE "products" SET "laborRate" = 22 WHERE "laborRate" = 0;
