-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isBench" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_messageId_key" ON "Event"("messageId");

-- CreateIndex
CREATE INDEX "Event_guildId_idx" ON "Event"("guildId");

-- CreateIndex
CREATE INDEX "EventSignup_eventId_idx" ON "EventSignup"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignup_eventId_userId_key" ON "EventSignup"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
