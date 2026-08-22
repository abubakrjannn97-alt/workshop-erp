-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pipelineStatus" TEXT NOT NULL DEFAULT 'NEW';
