-- CreateEnum
CREATE TYPE "EventPhase" AS ENUM ('SETUP', 'NOMINATIONS', 'NOMINATIONS_CLOSED', 'FINALISTS_READY', 'VOTING', 'VOTING_CLOSED', 'CEREMONY', 'FINISHED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('PRIZE', 'HONORARY');

-- CreateEnum
CREATE TYPE "BallotPhase" AS ENUM ('NOMINATION', 'VOTE');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "phase" "EventPhase" NOT NULL DEFAULT 'SETUP',
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "minNominations" INTEGER NOT NULL DEFAULT 3,
    "maxNominations" INTEGER NOT NULL DEFAULT 5,
    "finalistsPerCategory" INTEGER NOT NULL DEFAULT 4,
    "maxPrizeCategories" INTEGER NOT NULL DEFAULT 15,
    "nominationPublicKey" TEXT,
    "votePublicKey" TEXT,
    "notarySetupTokenHash" TEXT,
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "showWinnerPercent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "hasNominated" BOOLEAN NOT NULL DEFAULT false,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "revealOrder" INTEGER NOT NULL DEFAULT 0,
    "activeForVote" BOOLEAN NOT NULL DEFAULT false,
    "revealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finalist" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "participantId" TEXT,
    "photoUrl" TEXT,
    "blurb" TEXT,

    CONSTRAINT "Finalist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ballot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "phase" "BallotPhase" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_roomCode_key" ON "Event"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_normalizedName_key" ON "Participant"("eventId", "normalizedName");

-- CreateIndex
CREATE INDEX "Category_eventId_sortOrder_idx" ON "Category"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "Finalist_categoryId_idx" ON "Finalist"("categoryId");

-- CreateIndex
CREATE INDEX "Ballot_eventId_phase_idx" ON "Ballot"("eventId", "phase");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finalist" ADD CONSTRAINT "Finalist_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
