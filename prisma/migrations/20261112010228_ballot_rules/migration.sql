-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowNominationSkip" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowVoteAbstention" BOOLEAN NOT NULL DEFAULT true;
