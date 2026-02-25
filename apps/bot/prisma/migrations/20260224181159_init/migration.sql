-- CreateTable
CREATE TABLE "RosterPost" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterSelection" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classes" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RosterPost_messageId_key" ON "RosterPost"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterSelection_postId_userId_key" ON "RosterSelection"("postId", "userId");

-- AddForeignKey
ALTER TABLE "RosterSelection" ADD CONSTRAINT "RosterSelection_postId_fkey" FOREIGN KEY ("postId") REFERENCES "RosterPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
