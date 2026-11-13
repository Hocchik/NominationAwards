import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { EventPhase } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { closedUrns } from "./urns";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Arranca los nombres de los sobres de las urnas ya cerradas en `phase`
 * (regla 2). Es idempotente: se llama al cambiar de fase y, por seguridad,
 * justo antes de entregar papeletas para abrirlas.
 */
export async function unlinkClosedUrns(db: Db, eventId: string, phase: EventPhase): Promise<void> {
  const urns = closedUrns(phase);
  if (urns.length === 0) return;
  await db.ballot.updateMany({
    where: { eventId, phase: { in: urns }, participantId: { not: null } },
    data: { participantId: null },
  });
}

/**
 * Cambia la fase solo si sigue siendo `from` (si dos pestañas o visitas lo
 * intentan a la vez, una sola gana). En la MISMA transacción arranca los
 * nombres de los sobres de la urna que se cierra: nunca existe un momento en
 * que la urna esté cerrada y sus sobres todavía lleven nombre.
 */
export async function movePhase(eventId: string, from: EventPhase, to: EventPhase): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const moved = await tx.event.updateMany({ where: { id: eventId, phase: from }, data: { phase: to } });
    if (moved.count !== 1) return false;
    await unlinkClosedUrns(tx, eventId, to);
    return true;
  });
}
