-- MakeLeadCountryOptional
-- Make country field nullable in Lead model to match DTO optional behavior

ALTER TABLE "Lead" ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "country" DROP DEFAULT;
