import "server-only";

import type { BallotPhase } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

// Envío atómico de una papeleta (CLAUDE.md §4, regla 4). Antes de tocar este
// archivo, releer la sección 4.
//
// Todo pasa en UNA transacción: la fase sigue abierta → se marca al
// participante (solo si no había enviado) → se guarda la papeleta. Si dos
// dispositivos envían a la vez, Postgres bloquea la fila del participante: el
// segundo vuelve a evaluar "hasNominated = false", ya no coincide, y su
// transacción se deshace sin guardar nada.
//
// La papeleta lleva el id de quien la envió SOLO mientras la urna está abierta
// («nombre por fuera del sobre», regla 2), para poder botarla si votó otra
// persona en su nombre. Al cerrar la fase se borra (lib/event/transition.ts).

const PHASE_OPEN = { NOMINATION: "NOMINATIONS", VOTE: "VOTING" } as const;
const NOT_SENT = { NOMINATION: { hasNominated: false }, VOTE: { hasVoted: false } } as const;
const SENT = { NOMINATION: { hasNominated: true }, VOTE: { hasVoted: true } } as const;

export type RecordResult = { ok: true } | { ok: false; reason: "closed" | "already-sent" };

class Rejected<R extends string> extends Error {
  constructor(readonly reason: R) {
    super(reason);
  }
}

export async function recordBallot(input: {
  eventId: string;
  participantId: string;
  phase: BallotPhase;
  ciphertext: string;
}): Promise<RecordResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const open = await tx.event.count({
        where: { id: input.eventId, phase: PHASE_OPEN[input.phase] },
      });
      if (open !== 1) throw new Rejected("closed");

      const marked = await tx.participant.updateMany({
        where: { id: input.participantId, eventId: input.eventId, ...NOT_SENT[input.phase] },
        data: SENT[input.phase],
      });
      if (marked.count !== 1) throw new Rejected("already-sent");

      await tx.ballot.create({
        data: {
          eventId: input.eventId,
          phase: input.phase,
          ciphertext: input.ciphertext,
          participantId: input.participantId,
        },
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, reason: error.reason as "closed" | "already-sent" };
    throw error;
  }
}

export type DiscardResult = { ok: true } | { ok: false; reason: "closed" | "not-found" };

/**
 * Bota el sobre de una persona mientras la urna sigue abierta (el admin lo
 * usa si alguien votó en nombre de otro). En la misma transacción la deja
 * volver a enviar y cierra las sesiones abiertas con su nombre, para que la
 * persona real entre de nuevo y vote.
 *
 * El admin nunca ve el contenido del sobre: solo lo bota sin abrirlo.
 */
export async function discardBallot(input: {
  eventId: string;
  participantId: string;
  phase: BallotPhase;
}): Promise<DiscardResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const open = await tx.event.count({
        where: { id: input.eventId, phase: PHASE_OPEN[input.phase] },
      });
      if (open !== 1) throw new Rejected("closed");

      const removed = await tx.ballot.deleteMany({
        where: { eventId: input.eventId, phase: input.phase, participantId: input.participantId },
      });
      // Sin su sobre no se puede devolver el envío: quedarían dos papeletas suyas.
      if (removed.count !== 1) throw new Rejected("not-found");

      await tx.participant.updateMany({
        where: { id: input.participantId, eventId: input.eventId },
        data: { ...NOT_SENT[input.phase], sessionVersion: { increment: 1 } },
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, reason: error.reason as "closed" | "not-found" };
    throw error;
  }
}

/**
 * Quita un nombre de la lista de invitados. Si ya envió su sobre en la urna
 * que está abierta, ese sobre también se bota; los de urnas ya cerradas no se
 * pueden identificar (ya no llevan nombre) y siguen contando.
 */
export async function removeGuest(input: { eventId: string; participantId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.ballot.deleteMany({ where: { eventId: input.eventId, participantId: input.participantId } });
    await tx.participant.deleteMany({ where: { id: input.participantId, eventId: input.eventId } });
  });
}
