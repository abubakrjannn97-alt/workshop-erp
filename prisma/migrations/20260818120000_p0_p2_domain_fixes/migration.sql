-- Append-only audit log (DB-level, independent of Prisma client).
CREATE OR REPLACE FUNCTION audit_logs_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE PROCEDURE audit_logs_append_only();

CREATE TABLE "crm_documents" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "payload" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_documents_leadId_idx" ON "crm_documents"("leadId");
CREATE INDEX "crm_documents_type_createdAt_idx" ON "crm_documents"("type", "createdAt");

ALTER TABLE "crm_documents" ADD CONSTRAINT "crm_documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "production_stages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_stages_code_key" ON "production_stages"("code");

ALTER TABLE "production_orders" ADD COLUMN "stageId" TEXT;
CREATE INDEX "production_orders_stageId_idx" ON "production_orders"("stageId");
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "production_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "obligations" ADD COLUMN "interval" TEXT;
ALTER TABLE "obligations" ADD COLUMN "lastPostedAt" TIMESTAMP(3);

INSERT INTO "lead_stages" ("id", "code", "name", "sortOrder", "isLost", "isWon")
SELECT 'clpaid000000000000000001', 'PAID', 'Оплата', 75, false, false
WHERE NOT EXISTS (SELECT 1 FROM "lead_stages" WHERE "code" = 'PAID');
