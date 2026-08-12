CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,6) NOT NULL,
    "producedQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "scrapQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_orders_orderId_key" ON "production_orders"("orderId");

CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,6) NOT NULL,
    "actualQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "scrapQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "responsibleUserId" TEXT,
    "producedAt" TIMESTAMP(3),
    "comment" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_batches_productionOrderId_number_key" ON "production_batches"("productionOrderId", "number");
CREATE INDEX "production_batches_productionOrderId_idx" ON "production_batches"("productionOrderId");

CREATE TABLE "batch_material_uses" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,6) NOT NULL,
    "actualQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    CONSTRAINT "batch_material_uses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "batch_material_uses_batchId_idx" ON "batch_material_uses"("batchId");

CREATE TABLE "scrap_records" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT,
    "photoUrl" TEXT,
    "materialCost" DECIMAL(18,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scrap_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scrap_records_batchId_idx" ON "scrap_records"("batchId");

ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_material_uses" ADD CONSTRAINT "batch_material_uses_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_material_uses" ADD CONSTRAINT "batch_material_uses_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
