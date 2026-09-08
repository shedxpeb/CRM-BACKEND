-- Add missing quotation fields for Page 2 content and inquiry tracking
-- This migration adds fields that exist in schema.prisma but were missing from previous migrations

-- Add inquiry tracking fields
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "inquiryNumber" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3);

-- Add customer address fields (missing from initial migrations)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "customerCity" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "customerState" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "customerPincode" TEXT;

-- Add lead reference (missing from second migration)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- Add Page 2: Prepared By snapshot fields
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByCompany" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByAddress" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByGstin" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByName" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByDesignation" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByMobile" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preparedByEmail" TEXT;

-- Add Page 2: Document content fields
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "introduction" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "signaturePrefix" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "signatureDesignation" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "signatureMobile" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "signatureEmail" TEXT;

-- Add JSON fields missing from initial migrations
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "inclusions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "exclusions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "timeline" JSONB;

-- Add amountInWords field (missing from migrations)
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "amountInWords" TEXT;
