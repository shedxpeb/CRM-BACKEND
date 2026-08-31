-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected', 'Expired', 'Converted');

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "proposalId" TEXT,
    "proposalNumber" TEXT,
    "sourceEstimateId" TEXT,
    "sourceEstimateNumber" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerGST" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "leadId" TEXT,
    "leadNumber" TEXT,
    "materialSelections" JSONB NOT NULL DEFAULT '[]',
    "pricingConfiguration" JSONB,
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
    "cgstAmount" DOUBLE PRECISION,
    "sgstAmount" DOUBLE PRECISION,
    "igstAmount" DOUBLE PRECISION,
    "cessAmount" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "validUntil" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "termsAndConditions" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "convertedToProjectId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "templateId" TEXT,
    "createdById" TEXT,
    "createdBy" TEXT,
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
CREATE INDEX "Quotation_organizationId_status_idx" ON "Quotation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");

-- CreateIndex
CREATE INDEX "Quotation_isDeleted_idx" ON "Quotation"("isDeleted");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
