-- CreateTable
CREATE TABLE "GroupPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GroupPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupPhoto_eventId_slot_key" ON "GroupPhoto"("eventId", "slot");

-- AddForeignKey
ALTER TABLE "GroupPhoto" ADD CONSTRAINT "GroupPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

