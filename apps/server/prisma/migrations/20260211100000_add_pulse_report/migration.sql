-- CreateTable
CREATE TABLE "PulseReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "aiSuggestions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PulseReport_roomId_key" ON "PulseReport"("roomId");

-- AddForeignKey
ALTER TABLE "PulseReport" ADD CONSTRAINT "PulseReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
