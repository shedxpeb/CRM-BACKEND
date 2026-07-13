-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('New', 'Contacted', 'DesignPending', 'BOQPending', 'EstimateSent', 'ProposalSent', 'Negotiation', 'Approved', 'Rejected', 'Converted');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('Factory', 'Warehouse', 'IndustrialShed', 'Commercial', 'Residential', 'Other');

-- CreateEnum
CREATE TYPE "StructureType" AS ENUM ('PEB', 'SteelStructure', 'Hybrid', 'Other');

-- CreateEnum
CREATE TYPE "RoofType" AS ENUM ('MetalSheet', 'DeckSheet', 'SandwichPanel', 'Other');

-- CreateEnum
CREATE TYPE "WallType" AS ENUM ('MetalSheet', 'BrickWall', 'SandwichPanel', 'Other');

-- CreateEnum
CREATE TYPE "MaterialPreference" AS ENUM ('Standard', 'Premium', 'Economy');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('Website', 'Referral', 'ColdCall', 'Email', 'SocialMedia', 'TradeShow', 'Advertisement', 'Other');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadId" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "email" TEXT NOT NULL,
    "gstNumber" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "projectTitle" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "structureType" "StructureType" NOT NULL,
    "width" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "baySpacing" DOUBLE PRECISION,
    "roofType" "RoofType",
    "craneRequired" BOOLEAN DEFAULT false,
    "craneCapacity" DOUBLE PRECISION,
    "mezzanine" BOOLEAN DEFAULT false,
    "mezzanineArea" DOUBLE PRECISION,
    "mezzanineLoad" DOUBLE PRECISION,
    "wallType" "WallType",
    "insulationRequired" BOOLEAN DEFAULT false,
    "insulationType" TEXT,
    "insulationThickness" DOUBLE PRECISION,
    "materialPreference" "MaterialPreference",
    "siteLocation" TEXT,
    "siteAddress" TEXT,
    "mapCoordinates" TEXT,
    "soilNotes" TEXT,
    "customerNotes" TEXT,
    "attachments" TEXT[],
    "specialRequirement" TEXT,
    "source" "LeadSource" NOT NULL,
    "priority" "LeadPriority" NOT NULL,
    "assignedEmployee" TEXT,
    "assignedEmployeeId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'New',
    "score" DOUBLE PRECISION,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFollowUp" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "convertedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "customFields" JSONB,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadId_key" ON "Lead"("leadId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_assignedEmployeeId_idx" ON "Lead"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "Lead_createdDate_idx" ON "Lead"("createdDate");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpDate_idx" ON "Lead"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "Lead_projectType_idx" ON "Lead"("projectType");

-- CreateIndex
CREATE INDEX "Lead_structureType_idx" ON "Lead"("structureType");

-- CreateIndex
CREATE INDEX "Lead_customerName_idx" ON "Lead"("customerName");

-- CreateIndex
CREATE INDEX "Lead_companyName_idx" ON "Lead"("companyName");

-- CreateIndex
CREATE INDEX "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
