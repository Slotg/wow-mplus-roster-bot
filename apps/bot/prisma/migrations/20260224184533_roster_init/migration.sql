/*
  Warnings:

  - You are about to drop the `RosterPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RosterSelection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RosterSelection" DROP CONSTRAINT "RosterSelection_postId_fkey";

-- DropTable
DROP TABLE "RosterPost";

-- DropTable
DROP TABLE "RosterSelection";

-- CreateTable
CREATE TABLE "GuildRoster" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildRoster_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "RosterMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterMemberClass" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "wowClass" TEXT NOT NULL,

    CONSTRAINT "RosterMemberClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildRoster_messageId_key" ON "GuildRoster"("messageId");

-- CreateIndex
CREATE INDEX "RosterMember_guildId_idx" ON "RosterMember"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_guildId_userId_key" ON "RosterMember"("guildId", "userId");

-- CreateIndex
CREATE INDEX "RosterMemberClass_wowClass_idx" ON "RosterMemberClass"("wowClass");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMemberClass_memberId_wowClass_key" ON "RosterMemberClass"("memberId", "wowClass");

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildRoster"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMemberClass" ADD CONSTRAINT "RosterMemberClass_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RosterMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
