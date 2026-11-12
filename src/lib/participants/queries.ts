import "server-only";

import { prisma } from "@/lib/db";
import { applySchedule } from "@/lib/event/queries";

/** El evento de una sala, con la fase ya al día según el horario de votación. */
export async function getEventByRoomCode(roomCode: string) {
  const event = await prisma.event.findUnique({ where: { roomCode: roomCode.toUpperCase() } });
  return event && applySchedule(event);
}

/** Registros que ocupan cupo: pendientes y aprobados (los rechazados liberan su lugar). */
export function countActiveRegistrations(eventId: string): Promise<number> {
  return prisma.participant.count({ where: { eventId, status: { not: "REJECTED" } } });
}

/** Nombres para "Ya me registré": pendientes y aprobados, en orden alfabético. */
export async function listLoginNames(eventId: string): Promise<string[]> {
  const rows = await prisma.participant.findMany({
    where: { eventId, status: { not: "REJECTED" } },
    select: { displayName: true },
    orderBy: { normalizedName: "asc" },
  });
  return rows.map((row) => row.displayName);
}
