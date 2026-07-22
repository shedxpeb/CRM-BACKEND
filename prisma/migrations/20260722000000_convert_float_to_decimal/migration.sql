-- AlterTable: Convert Float (DOUBLE PRECISION) to Decimal for financial accuracy
-- This is a safe, lossless migration: PostgreSQL DOUBLE PRECISION -> DECIMAL(P,S)
-- Existing data is preserved with full precision; new data gets exact decimal arithmetic

-- Project: financial amounts (14,2) and measurements (12,3)
ALTER TABLE "Project" ALTER COLUMN "value" SET DATA TYPE DECIMAL(14,2) USING "value"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(14,2) USING "budget"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "width" SET DATA TYPE DECIMAL(12,3) USING "width"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "length" SET DATA TYPE DECIMAL(12,3) USING "length"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "height" SET DATA TYPE DECIMAL(12,3) USING "height"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "baySpacing" SET DATA TYPE DECIMAL(12,3) USING "baySpacing"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "coveredArea" SET DATA TYPE DECIMAL(12,3) USING "coveredArea"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "totalWeight" SET DATA TYPE DECIMAL(12,3) USING "totalWeight"::DECIMAL(12,3);
ALTER TABLE "Project" ALTER COLUMN "materialCost" SET DATA TYPE DECIMAL(14,2) USING "materialCost"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "procurementCost" SET DATA TYPE DECIMAL(14,2) USING "procurementCost"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "fabricationCost" SET DATA TYPE DECIMAL(14,2) USING "fabricationCost"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "installationCost" SET DATA TYPE DECIMAL(14,2) USING "installationCost"::DECIMAL(14,2);
ALTER TABLE "Project" ALTER COLUMN "profitMargin" SET DATA TYPE DECIMAL(5,2) USING "profitMargin"::DECIMAL(5,2);

-- Lead: measurements (12,3) and financial (14,2)
ALTER TABLE "Lead" ALTER COLUMN "baySpacing" SET DATA TYPE DECIMAL(12,3) USING "baySpacing"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "craneCapacity" SET DATA TYPE DECIMAL(12,3) USING "craneCapacity"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "height" SET DATA TYPE DECIMAL(12,3) USING "height"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "insulationThickness" SET DATA TYPE DECIMAL(12,3) USING "insulationThickness"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "length" SET DATA TYPE DECIMAL(12,3) USING "length"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "mezzanineArea" SET DATA TYPE DECIMAL(12,3) USING "mezzanineArea"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "mezzanineLoad" SET DATA TYPE DECIMAL(12,3) USING "mezzanineLoad"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "width" SET DATA TYPE DECIMAL(12,3) USING "width"::DECIMAL(12,3);
ALTER TABLE "Lead" ALTER COLUMN "annualRevenue" SET DATA TYPE DECIMAL(14,2) USING "annualRevenue"::DECIMAL(14,2);

-- ItemMaster: measurements (12,3) and financial (14,2)
ALTER TABLE "ItemMaster" ALTER COLUMN "weight" SET DATA TYPE DECIMAL(12,3) USING "weight"::DECIMAL(12,3);
ALTER TABLE "ItemMaster" ALTER COLUMN "defaultRate" SET DATA TYPE DECIMAL(14,2) USING "defaultRate"::DECIMAL(14,2);
ALTER TABLE "ItemMaster" ALTER COLUMN "gstRate" SET DATA TYPE DECIMAL(5,2) USING "gstRate"::DECIMAL(5,2);
ALTER TABLE "ItemMaster" ALTER COLUMN "thickness" SET DATA TYPE DECIMAL(12,3) USING "thickness"::DECIMAL(12,3);
ALTER TABLE "ItemMaster" ALTER COLUMN "length" SET DATA TYPE DECIMAL(12,3) USING "length"::DECIMAL(12,3);
ALTER TABLE "ItemMaster" ALTER COLUMN "width" SET DATA TYPE DECIMAL(12,3) USING "width"::DECIMAL(12,3);

-- ItemVariant: weight (12,3) and rate (14,2)
ALTER TABLE "ItemVariant" ALTER COLUMN "standardWeight" SET DATA TYPE DECIMAL(12,3) USING "standardWeight"::DECIMAL(12,3);
ALTER TABLE "ItemVariant" ALTER COLUMN "defaultRate" SET DATA TYPE DECIMAL(14,2) USING "defaultRate"::DECIMAL(14,2);

-- ItemBundle: rate (14,2) and percentage (5,2)
ALTER TABLE "ItemBundle" ALTER COLUMN "bundleRate" SET DATA TYPE DECIMAL(14,2) USING "bundleRate"::DECIMAL(14,2);
ALTER TABLE "ItemBundle" ALTER COLUMN "discountPercentage" SET DATA TYPE DECIMAL(5,2) USING "discountPercentage"::DECIMAL(5,2);

-- ItemBundleItem: rate (14,2)
ALTER TABLE "ItemBundleItem" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,2) USING "rate"::DECIMAL(14,2);

-- Warehouse: capacity (12,3)
ALTER TABLE "Warehouse" ALTER COLUMN "capacity" SET DATA TYPE DECIMAL(12,3) USING "capacity"::DECIMAL(12,3);
ALTER TABLE "Warehouse" ALTER COLUMN "currentOccupancy" SET DATA TYPE DECIMAL(12,3) USING "currentOccupancy"::DECIMAL(12,3);

-- Supplier: rating (5,2)
ALTER TABLE "Supplier" ALTER COLUMN "rating" SET DATA TYPE DECIMAL(5,2) USING "rating"::DECIMAL(5,2);

-- InventoryItem: stock quantities (12,3) and financial (14,2)
ALTER TABLE "InventoryItem" ALTER COLUMN "currentStock" SET DATA TYPE DECIMAL(12,3) USING "currentStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "reservedStock" SET DATA TYPE DECIMAL(12,3) USING "reservedStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "issuedStock" SET DATA TYPE DECIMAL(12,3) USING "issuedStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "minimumStock" SET DATA TYPE DECIMAL(12,3) USING "minimumStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "reorderLevel" SET DATA TYPE DECIMAL(12,3) USING "reorderLevel"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "safetyStock" SET DATA TYPE DECIMAL(12,3) USING "safetyStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "purchaseRate" SET DATA TYPE DECIMAL(14,2) USING "purchaseRate"::DECIMAL(14,2);
ALTER TABLE "InventoryItem" ALTER COLUMN "totalValue" SET DATA TYPE DECIMAL(14,2) USING "totalValue"::DECIMAL(14,2);
ALTER TABLE "InventoryItem" ALTER COLUMN "reorderQuantity" SET DATA TYPE DECIMAL(12,3) USING "reorderQuantity"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "incomingStock" SET DATA TYPE DECIMAL(12,3) USING "incomingStock"::DECIMAL(12,3);
ALTER TABLE "InventoryItem" ALTER COLUMN "outgoingStock" SET DATA TYPE DECIMAL(12,3) USING "outgoingStock"::DECIMAL(12,3);

-- StockMovement: quantity (12,3)
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3) USING "quantity"::DECIMAL(12,3);

-- Vendor: financial (14,2)
ALTER TABLE "Vendor" ALTER COLUMN "creditLimit" SET DATA TYPE DECIMAL(14,2) USING "creditLimit"::DECIMAL(14,2);
ALTER TABLE "Vendor" ALTER COLUMN "outstanding" SET DATA TYPE DECIMAL(14,2) USING "outstanding"::DECIMAL(14,2);

-- PurchaseOrder: all financial (14,2)
ALTER TABLE "PurchaseOrder" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(14,2) USING "subtotal"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(14,2) USING "discount"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "tax" SET DATA TYPE DECIMAL(14,2) USING "tax"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "freight" SET DATA TYPE DECIMAL(14,2) USING "freight"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "packingCharges" SET DATA TYPE DECIMAL(14,2) USING "packingCharges"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "shippingCharges" SET DATA TYPE DECIMAL(14,2) USING "shippingCharges"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "otherCharges" SET DATA TYPE DECIMAL(14,2) USING "otherCharges"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "roundOff" SET DATA TYPE DECIMAL(14,2) USING "roundOff"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrder" ALTER COLUMN "grandTotal" SET DATA TYPE DECIMAL(14,2) USING "grandTotal"::DECIMAL(14,2);

-- PurchaseOrderItem: quantities (12,3) and financial (14,2)
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3) USING "quantity"::DECIMAL(12,3);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,2) USING "rate"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "gstRate" SET DATA TYPE DECIMAL(5,2) USING "gstRate"::DECIMAL(5,2);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "gstAmount" SET DATA TYPE DECIMAL(14,2) USING "gstAmount"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(14,2) USING "discount"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "total" SET DATA TYPE DECIMAL(14,2) USING "total"::DECIMAL(14,2);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "receivedQuantity" SET DATA TYPE DECIMAL(12,3) USING "receivedQuantity"::DECIMAL(12,3);
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "pendingQuantity" SET DATA TYPE DECIMAL(12,3) USING "pendingQuantity"::DECIMAL(12,3);

-- NumberSequence: atomic counter for entity number generation (PO, etc.)
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NumberSequence_organizationId_entityName_key" ON "NumberSequence"("organizationId", "entityName");
CREATE INDEX "NumberSequence_organizationId_idx" ON "NumberSequence"("organizationId");
