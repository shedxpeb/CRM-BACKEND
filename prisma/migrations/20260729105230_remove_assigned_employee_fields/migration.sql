/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `Lead` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Lead_assignedToId_idx";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "assignedTo",
DROP COLUMN "assignedToId";
