-- Apodos de los invitados («Gabo»): el buscador de la sala también los encuentra.

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
