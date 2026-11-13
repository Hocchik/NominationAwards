"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { unlinkClosedUrns } from "@/lib/event/transition";

// Ceremonia (CLAUDE.md §3, paso 7). Antes de tocar este archivo, releer la
// sección 4: el servidor entrega los votos cifrados y nada más; se abren en
// el navegador de la ceremonia con la llave del notario.

export async function getVoteBallotsAction(): Promise<
  { ok: true; ciphertexts: string[] } | { ok: false; message: string }
> {
  await requireAdmin();
  const event = await getCurrentEvent();
  // Solo en la fase de ceremonia: abrir los votos antes sería ver resultados
  // antes de tiempo, y avanzar a «Ceremonia» queda a la vista en el panel.
  if (!event || event.phase !== "CEREMONY") {
    return { ok: false, message: "El evento todavía no está en la ceremonia." };
  }
  // Antes de entregarlos para abrirlos, ningún sobre puede llevar nombre
  // (regla 2): ya se arrancaron al cerrar la votación; esto es una red de seguridad.
  await unlinkClosedUrns(prisma, event.id, event.phase);
  // Orden por id (UUID aleatorio), nunca por orden de llegada (regla 9).
  const ballots = await prisma.ballot.findMany({
    where: { eventId: event.id, phase: "VOTE" },
    select: { ciphertext: true },
    orderBy: { id: "asc" },
  });
  return { ok: true, ciphertexts: ballots.map((b) => b.ciphertext) };
}
