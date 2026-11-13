import "server-only";

import { prisma } from "@/lib/db";
import { applySchedule } from "@/lib/event/queries";

/** El evento de una sala, con la fase ya al día según el horario de votación. */
export async function getEventByRoomCode(roomCode: string) {
  const event = await prisma.event.findUnique({ where: { roomCode: roomCode.toUpperCase() } });
  return event && applySchedule(event);
}

/** Cuántos nombres tiene la lista de invitados (el cupo es Event.capacity). */
export function countGuests(eventId: string): Promise<number> {
  return prisma.participant.count({ where: { eventId } });
}

/**
 * Nombres de la lista de invitados, en orden alfabético, para elegir el tuyo
 * al entrar. Solo los nombres: nada que diga quién ya entró o votó.
 */
export async function listGuestNames(eventId: string): Promise<string[]> {
  const rows = await prisma.participant.findMany({
    where: { eventId },
    select: { displayName: true },
    orderBy: { normalizedName: "asc" },
  });
  return rows.map((row) => row.displayName);
}
