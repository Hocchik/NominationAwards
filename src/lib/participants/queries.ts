import "server-only";

import { prisma } from "@/lib/db";
import { applySchedule } from "@/lib/event/queries";
import type { GuestEntry } from "./guests";

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
 * La lista de invitados, en orden alfabético, para elegir tu nombre al entrar
 * (con apodos, para el buscador). Nada que diga quién ya entró o votó.
 */
export async function listGuests(eventId: string): Promise<GuestEntry[]> {
  const rows = await prisma.participant.findMany({
    where: { eventId },
    select: { displayName: true, aliases: true, searchNames: true },
    orderBy: { normalizedName: "asc" },
  });
  return rows.map((row) => ({ name: row.displayName, aliases: row.aliases, searchNames: row.searchNames }));
}
