"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { RESET_WORD, WIPE_WORD, confirmsWith } from "@/lib/event/reset";

// Volver a empezar (decisión del usuario, 2026-11-25). Las papeletas se borran
// SIN abrirse (nadie las lee) y las llaves del notario se descartan: para el
// evento nuevo hay que generar llaves nuevas.

export type ResetState = { ok: boolean; message?: string };

const matches = (formData: FormData, word: string) => confirmsWith(String(formData.get("confirm") ?? ""), word);

/** Vuelve a Preparación: borra papeletas, finalistas, participación y llaves; conserva categorías, invitados, horarios y fotos grupales. */
export async function resetEventAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return { ok: false, message: "No hay evento." };
  if (!matches(formData, RESET_WORD)) return { ok: false, message: `Escribe ${RESET_WORD} para confirmar.` };
  await prisma.$transaction([
    prisma.finalist.deleteMany({ where: { category: { eventId: event.id } } }),
    prisma.ballot.deleteMany({ where: { eventId: event.id } }),
    prisma.participant.updateMany({
      where: { eventId: event.id },
      data: { hasNominated: false, hasVoted: false, sessionVersion: { increment: 1 } },
    }),
    prisma.category.updateMany({ where: { eventId: event.id }, data: { activeForVote: false, revealed: false } }),
    prisma.event.update({
      where: { id: event.id },
      data: { phase: "SETUP", nominationPublicKey: null, votePublicKey: null, notarySetupTokenHash: null },
    }),
  ]);
  refresh();
  return { ok: true, message: "Evento reiniciado: está en Preparación. Genera llaves nuevas para el notario antes de abrir." };
}

/** Desde cero: además borra categorías, invitados, horarios y fotos grupales. El nombre y los ajustes del evento quedan. */
export async function wipeEventAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return { ok: false, message: "No hay evento." };
  if (!matches(formData, WIPE_WORD)) return { ok: false, message: `Escribe ${WIPE_WORD} para confirmar.` };
  await prisma.$transaction([
    prisma.finalist.deleteMany({ where: { category: { eventId: event.id } } }),
    prisma.categoryOption.deleteMany({ where: { category: { eventId: event.id } } }),
    prisma.category.deleteMany({ where: { eventId: event.id } }),
    prisma.ballot.deleteMany({ where: { eventId: event.id } }),
    prisma.participant.deleteMany({ where: { eventId: event.id } }),
    prisma.groupPhoto.deleteMany({ where: { eventId: event.id } }),
    prisma.event.update({
      where: { id: event.id },
      data: {
        phase: "SETUP",
        nominationPublicKey: null,
        votePublicKey: null,
        notarySetupTokenHash: null,
        nominationsCloseAt: null,
        votingOpensAt: null,
        votingClosesAt: null,
      },
    }),
  ]);
  refresh();
  return { ok: true, message: "Todo borrado: el evento quedó vacío en Preparación." };
}
