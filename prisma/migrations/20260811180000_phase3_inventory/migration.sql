CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "materialId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "qtyOnHand" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "qtyReserved" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "wacUnitCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_items_warehouseId_materialId_key" ON "stock_items"("warehouseId", "materialId");
CREATE INDEX "stock_items_warehouseId_productId_idx" ON "stock_items"("warehouseId", "productId");
CREATE INDEX "stock_items_warehouseId_idx" ON "stock_items"("warehouseId");

CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL,
    "reservedDelta" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "idempotencyKey" TEXT,
    "reversesId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_movements_idempotencyKey_key" ON "stock_movements"("idempotencyKey");
CREATE UNIQUE INDEX "stock_movements_reversesId_key" ON "stock_movements"("reversesId");
CREATE INDEX "stock_movements_stockItemId_createdAt_idx" ON "stock_movements"("stockItemId", "createdAt");
CREATE INDEX "stock_movements_type_createdAt_idx" ON "stock_movements"("type", "createdAt");
CREATE INDEX "stock_movements_relatedType_relatedId_idx" ON "stock_movements"("relatedType", "relatedId");

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_materials" (
    "supplierId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    CONSTRAINT "supplier_materials_pkey" PRIMARY KEY ("supplierId","materialId")
);

CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdById" TEXT,
    "confirmedById" TEXT,
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("number");
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unitPrice" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "receivedQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_items_purchaseOrderId_idx" ON "purchase_items"("purchaseOrderId");

CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_payments_purchaseOrderId_idx" ON "purchase_payments"("purchaseOrderId");

CREATE TABLE "inventory_counts" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "countedById" TEXT,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_counts_warehouseId_createdAt_idx" ON "inventory_counts"("warehouseId", "createdAt");

CREATE TABLE "inventory_count_lines" (
    "id" TEXT NOT NULL,
    "inventoryCountId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "systemQty" DECIMAL(18,6) NOT NULL,
    "actualQty" DECIMAL(18,6) NOT NULL,
    "difference" DECIMAL(18,6) NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    CONSTRAINT "inventory_count_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_count_lines_inventoryCountId_idx" ON "inventory_count_lines"("inventoryCountId");

ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_materials" ADD CONSTRAINT "supplier_materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_materials" ADD CONSTRAINT "supplier_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
