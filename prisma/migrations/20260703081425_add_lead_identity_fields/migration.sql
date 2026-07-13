/*
  Warnings:

  - You are about to drop the column `address` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `alternateMobile` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `assignedEmployee` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `assignedEmployeeId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `baySpacing` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `convertedDate` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `craneCapacity` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `craneRequired` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `createdDate` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `customFields` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `customerNotes` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `gstNumber` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `insulationRequired` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `insulationThickness` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `insulationType` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `mapCoordinates` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `materialPreference` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `mezzanine` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `mezzanineArea` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `mezzanineLoad` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `pincode` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `roofType` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `siteAddress` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `siteLocation` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `soilNotes` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `specialRequirement` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `wallType` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Lead` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[leadNumber]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Lead_assignedEmployeeId_idx";

-- DropIndex
DROP INDEX "Lead_city_idx";

-- DropIndex
DROP INDEX "Lead_createdDate_idx";

-- DropIndex
DROP INDEX "Lead_customerName_idx";

-- DropIndex
DROP INDEX "Lead_email_idx";

-- DropIndex
DROP INDEX "Lead_leadId_key";

-- DropIndex
DROP INDEX "Lead_projectType_idx";

-- DropIndex
DROP INDEX "Lead_source_idx";

-- DropIndex
DROP INDEX "Lead_structureType_idx";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "address",
DROP COLUMN "alternateMobile",
DROP COLUMN "assignedEmployee",
DROP COLUMN "assignedEmployeeId",
DROP COLUMN "attachments",
DROP COLUMN "baySpacing",
DROP COLUMN "convertedDate",
DROP COLUMN "craneCapacity",
DROP COLUMN "craneRequired",
DROP COLUMN "createdBy",
DROP COLUMN "createdDate",
DROP COLUMN "customFields",
DROP COLUMN "customerId",
DROP COLUMN "customerNotes",
DROP COLUMN "gstNumber",
DROP COLUMN "height",
DROP COLUMN "insulationRequired",
DROP COLUMN "insulationThickness",
DROP COLUMN "insulationType",
DROP COLUMN "leadId",
DROP COLUMN "length",
DROP COLUMN "mapCoordinates",
DROP COLUMN "materialPreference",
DROP COLUMN "mezzanine",
DROP COLUMN "mezzanineArea",
DROP COLUMN "mezzanineLoad",
DROP COLUMN "pincode",
DROP COLUMN "roofType",
DROP COLUMN "score",
DROP COLUMN "siteAddress",
DROP COLUMN "siteLocation",
DROP COLUMN "soilNotes",
DROP COLUMN "specialRequirement",
DROP COLUMN "state",
DROP COLUMN "updatedBy",
DROP COLUMN "wallType",
DROP COLUMN "width",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "isConverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdById_idx" ON "Lead"("createdById");
