-- CreateTable
CREATE TABLE "IdeaCard" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdBy" TEXT,
    "sourceMessageId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "weekStart" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "graph" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdeaCard_roomId_createdAt_idx" ON "IdeaCard"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "IdeaCard_roomId_weekStart_idx" ON "IdeaCard"("roomId", "weekStart");

-- CreateIndex
CREATE INDEX "IdeaCard_sourceMessageId_idx" ON "IdeaCard"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "IdeaCard" ADD CONSTRAINT "IdeaCard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaCard" ADD CONSTRAINT "IdeaCard_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaCard" ADD CONSTRAINT "IdeaCard_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
