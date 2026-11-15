import "server-only";

import { prisma } from "@/lib/db";

/**
 * Primer apodo de cada finalista que es del grupo, para mostrarlo bajo su nombre
 * (Nominados y la ceremonia). Quien ya no está en la lista o no tiene apodo no aparece.
 */
export async function finalistNicknames(
  eventId: string,
  categories: { finalists: { participantId: string | null }[] }[],
): Promise<Map<string, string>> {
  const ids = [...new Set(categories.flatMap((c) => c.finalists.flatMap((f) => (f.participantId ? [f.participantId] : []))))];
  if (ids.length === 0) return new Map();
  const people = await prisma.participant.findMany({ where: { eventId, id: { in: ids } }, select: { id: true, aliases: true } });
  return new Map(people.flatMap((p) => (p.aliases[0] ? [[p.id, p.aliases[0]] as const] : [])));
}
