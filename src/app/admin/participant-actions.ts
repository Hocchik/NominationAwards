"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { canManageParticipants } from "@/lib/event/rules";
import { countActiveRegistrations } from "@/lib/participants/queries";

// Gestión de registros (CLAUDE.md §5). El admin ve nombres y estado, y si cada
// persona nominó o votó (✔/⏳), nunca qué eligió.

/** El participante del formulario, si pertenece al evento y la fase lo permite. */
async function loadParticipant(formData: FormData) {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canManageParticipants(event.phase)) return null;
  const participant = await prisma.participant.findFirst({
    where: { id: String(formData.get("id") ?? ""), eventId: event.id },
  });
  return participant ? { event, participant } : null;
}

export async function approveParticipantAction(formData: FormData): Promise<void> {
  const found = await loadParticipant(formData);
  if (!found || found.participant.status === "APPROVED") return;
  // Un rechazado vuelve a ocupar cupo al aprobarse.
  if (
    found.participant.status === "REJECTED" &&
    (await countActiveRegistrations(found.event.id)) >= found.event.capacity
  ) {
    return;
  }
  await prisma.participant.update({ where: { id: found.participant.id }, data: { status: "APPROVED" } });
  refresh();
}

export async function rejectParticipantAction(formData: FormData): Promise<void> {
  const found = await loadParticipant(formData);
  if (!found) return;
  const { participant } = found;
  // Si ya participó, su papeleta anónima ya está en la urna: rechazarlo no la quita.
  if (participant.hasNominated || participant.hasVoted) return;
  await prisma.participant.update({ where: { id: participant.id }, data: { status: "REJECTED" } });
  refresh();
}

/**
 * Restablece el PIN: la persona crea uno nuevo la próxima vez que entra. El
 * admin nunca conoce el PIN. Solo si aún no votó (después ya no lo necesita).
 */
export async function resetPinAction(formData: FormData): Promise<void> {
  const found = await loadParticipant(formData);
  if (!found || found.participant.hasVoted) return;
  await prisma.participant.update({
    where: { id: found.participant.id },
    data: { pinReset: true, failedAttempts: 0, lockedUntil: null },
  });
  refresh();
}

/** Elimina un registro que todavía no nominó ni votó (p. ej., uno duplicado). */
export async function deleteParticipantAction(formData: FormData): Promise<void> {
  const found = await loadParticipant(formData);
  if (!found) return;
  await prisma.participant.deleteMany({
    where: { id: found.participant.id, hasNominated: false, hasVoted: false },
  });
  refresh();
}
