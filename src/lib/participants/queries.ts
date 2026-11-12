import "server-only";

import { prisma } from "@/lib/db";

export function getEventByRoomCode(roomCode: string) {
  return prisma.event.findUnique({ where: { roomCode: roomCode.toUpperCase() } });
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
