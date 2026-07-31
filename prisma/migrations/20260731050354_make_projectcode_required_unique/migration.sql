/*
  Warnings:

  - A unique constraint covering the columns `[projectCode]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- Generate project codes for existing NULL values
UPDATE "Project" 
SET "projectCode" = 'PRJ-' || LPAD("projectId"::TEXT, 6, '0')
WHERE "projectCode" IS NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "projectCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
