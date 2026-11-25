-- CreateEnum
CREATE TYPE "CategoryFraming" AS ENUM ('NORMAL', 'PRONE', 'QUESTION');

-- CreateEnum
CREATE TYPE "NomineeKind" AS ENUM ('PERSON', 'PAIR', 'OPTION');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "allowExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalistCount" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "framing" "CategoryFraming" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "maxPicks" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nomineeKind" "NomineeKind" NOT NULL DEFAULT 'PERSON';

-- AlterTable
ALTER TABLE "Finalist" ADD COLUMN     "optionId" TEXT,
ADD COLUMN     "partnerParticipantId" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "CategoryOption" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "photoUrl" TEXT,
    "blurb" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryOption_categoryId_idx" ON "CategoryOption"("categoryId");

-- AddForeignKey
ALTER TABLE "CategoryOption" ADD CONSTRAINT "CategoryOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

