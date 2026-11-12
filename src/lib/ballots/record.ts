import "server-only";

import type { BallotPhase } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

// Envío atómico de una papeleta (CLAUDE.md §4, regla 4). Antes de tocar este
// archivo, releer la sección 4.
//
// Todo pasa en UNA transacción: la fase sigue abierta → se marca al
// participante (solo si está aprobado y no había enviado) → se guarda la
// papeleta. Si dos dispositivos envían a la vez, Postgres bloquea la fila del
// participante: el segundo vuelve a evaluar "hasNominated = false", ya no
// coincide, y su transacción se deshace sin guardar nada.
//
// La papeleta se guarda sin ningún dato del participante (regla 2).

const PHASE_OPEN = { NOMINATION: "NOMINATIONS", VOTE: "VOTING" } as const;

export type RecordResult = { ok: true } | { ok: false; reason: "closed" | "already-sent" };

class Rejected extends Error {
  constructor(readonly reason: "closed" | "already-sent") {
    super(reason);
  }
}

export async function recordBallot(input: {
  eventId: string;
  participantId: string;
  phase: BallotPhase;
  ciphertext: string;
  receiptCode: string;
}): Promise<RecordResult> {
  const notSent = input.phase === "NOMINATION" ? { hasNominated: false } : { hasVoted: false };
  const markSent = input.phase === "NOMINATION" ? { hasNominated: true } : { hasVoted: true };
  try {
    await prisma.$transaction(async (tx) => {
      const open = await tx.event.count({
        where: { id: input.eventId, phase: PHASE_OPEN[input.phase] },
      });
      if (open !== 1) throw new Rejected("closed");

      const marked = await tx.participant.updateMany({
        where: { id: input.participantId, eventId: input.eventId, status: "APPROVED", ...notSent },
        data: markSent,
      });
      if (marked.count !== 1) throw new Rejected("already-sent");

      await tx.ballot.create({
        data: {
          eventId: input.eventId,
          phase: input.phase,
          ciphertext: input.ciphertext,
          receiptCode: input.receiptCode,
        },
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, reason: error.reason };
    throw error;
  }
}
