-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected', 'Expired', 'Converted');

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposalId" TEXT,
    "proposalNumber" TEXT,
    "sourceEstimateId" TEXT,
    "sourceEstimateNumber" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "customerState" TEXT,
    "customerPincode" TEXT,
    "customerGST" TEXT,
    "leadId" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "approvalStatus" TEXT,
    "validUntil" TIMESTAMP(3),
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "deliveryTerms" TEXT,
    "materialSelections" JSONB NOT NULL DEFAULT '[]',
    "scopeConfiguration" JSONB NOT NULL DEFAULT '{}',
    "technicalSpecifications" JSONB NOT NULL DEFAULT '{}',
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "proposalConfiguration" JSONB NOT NULL DEFAULT '{}',
    "timeline" JSONB,
    "pricingConfiguration" JSONB NOT NULL DEFAULT '{}',
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labourCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "craneCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "civilCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accommodationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "erectionCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freightCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCosts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercentage" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstType" TEXT NOT NULL DEFAULT 'CGST',
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "termsAndConditions" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdBy" TEXT,
    "createdById" TEXT,
    "convertedToProjectId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_organizationId_quotationNumber_key" ON "Quotation"("organizationId", "quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_idx" ON "Quotation"("organizationId");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_proposalId_idx" ON "Quotation"("proposalId");

-- CreateIndex
CREATE INDEX "Quotation_isDeleted_idx" ON "Quotation"("isDeleted");

-- CreateIndex
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
