import "server-only";

import { prisma } from "@/lib/db";
import { type FinalistRow, type GuestInfo, finalistGuestIds } from "./finalistDisplay";

/**
 * Los invitados que son finalistas (o mitad de una pareja finalista), con su
 * nombre, apodos y foto, para mostrarlos en Nominados, Votar y la ceremonia.
 * Quien ya no está en la lista simplemente no aparece.
 */
export async function finalistGuests(
  eventId: string,
  categories: { finalists: FinalistRow[] }[],
): Promise<Map<string, GuestInfo>> {
  const ids = finalistGuestIds(categories);
  if (ids.length === 0) return new Map();
  const people = await prisma.participant.findMany({
    where: { eventId, id: { in: ids } },
    select: { id: true, displayName: true, aliases: true, photoUrl: true },
  });
  return new Map(people.map((p) => [p.id, { displayName: p.displayName, aliases: p.aliases, photoUrl: p.photoUrl }]));
}
