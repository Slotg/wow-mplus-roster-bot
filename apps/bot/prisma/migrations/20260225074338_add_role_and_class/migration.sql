/*
  Warnings:

  - A unique constraint covering the columns `[memberId,wowClass,role]` on the table `RosterMemberClass` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `RosterMemberClass` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RosterMemberClass_memberId_wowClass_key";

-- AlterTable
ALTER TABLE "RosterMemberClass" ADD COLUMN     "role" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RosterMemberClass_memberId_wowClass_role_key" ON "RosterMemberClass"("memberId", "wowClass", "role");
