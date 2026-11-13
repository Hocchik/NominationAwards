-- Lista de invitados: el admin carga los nombres y cada persona entra tocando
-- el suyo (sin PIN ni aprobaciones). Sobres con nombre: la papeleta guarda
-- quién la envió solo mientras su fase está abierta. Sin comprobantes.

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "failedAttempts",
DROP COLUMN "lockedUntil",
DROP COLUMN "pinHash",
DROP COLUMN "pinReset",
DROP COLUMN "status",
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Ballot" DROP COLUMN "receiptCode",
ADD COLUMN     "participantId" TEXT;

-- DropEnum
DROP TYPE "ParticipantStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_eventId_phase_participantId_key" ON "Ballot"("eventId", "phase", "participantId");

