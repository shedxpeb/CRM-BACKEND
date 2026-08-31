-- Drop the existing unique constraint that applies to all rows including soft-deleted
ALTER TABLE "ItemMaster" DROP CONSTRAINT IF EXISTS "ItemMaster_organizationId_itemCode_key";

-- Create a partial unique index that only enforces uniqueness for active (non-deleted) records
-- This allows itemCode reuse after soft-delete while preventing duplicates among active records
CREATE UNIQUE INDEX "ItemMaster_organizationId_itemCode_active_idx" 
ON "ItemMaster" ("organizationId", "itemCode") 
WHERE "isDeleted" = false;
