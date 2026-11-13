"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { discardBallot, removeGuest } from "@/lib/ballots/record";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { canManageParticipants } from "@/lib/event/rules";
import type { FormState } from "@/lib/forms";
import { parseGuestList } from "@/lib/participants/guests";
import { normalizeName } from "@/lib/participants/names";

// Lista de invitados (CLAUDE.md §5). El admin ve los nombres y si cada uno ya
// nominó o votó (bloqueado), nunca qué eligió. Puede agregar o quitar nombres
// y botar el sobre de alguien (sin abrirlo) hasta que cierra la votación.

const CLOSED: FormState = { ok: false, message: "La votación cerró: la lista ya no se modifica." };

async function editableEvent() {
  await requireAdmin();
  const event = await getCurrentEvent();
  return event && canManageParticipants(event.phase) ? event : null;
}

/** Agrega los nombres pegados (uno por línea); se saltan los que ya están. */
export async function addGuestsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const event = await editableEvent();
  if (!event) return CLOSED;

  const text = String(formData.get("names") ?? "");
  const { names, invalid } = parseGuestList(text);
  if (names.length === 0) {
    return {
      ok: false,
      errors: { names: [invalid.length ? "Ningún nombre sirve: deben tener de 2 a 40 caracteres." : "Escribe al menos un nombre."] },
      values: { names: text },
    };
  }

  const existing = await prisma.participant.findMany({
    where: { eventId: event.id },
    select: { normalizedName: true },
  });
  const taken = new Set(existing.map((p) => p.normalizedName));
  const fresh = names.filter((n) => !taken.has(normalizeName(n)));
  const repeated = names.length - fresh.length;
  if (existing.length + fresh.length > event.capacity) {
    return {
      ok: false,
      message: `La lista tendría ${existing.length + fresh.length} nombres y el cupo es ${event.capacity}. Súbelo en Evento o agrega menos.`,
      values: { names: text },
    };
  }

  if (fresh.length) {
    await prisma.participant.createMany({
      data: fresh.map((n) => ({ eventId: event.id, displayName: n, normalizedName: normalizeName(n) })),
      skipDuplicates: true,
    });
  }
  refresh();
  const parts = [
    fresh.length ? `Se ${fresh.length === 1 ? "agregó 1 nombre" : `agregaron ${fresh.length} nombres`}.` : "No había nombres nuevos.",
    repeated ? `${repeated} ya ${repeated === 1 ? "estaba" : "estaban"} en la lista.` : "",
    invalid.length ? `Se saltó: ${invalid.join(", ")} (muy corto o muy largo).` : "",
  ];
  return { ok: true, message: parts.filter(Boolean).join(" ") };
}

const resetSchema = z.object({ id: z.string().min(1), phase: z.enum(["NOMINATION", "VOTE"]) });

/**
 * Bota el sobre de una persona sin abrirlo (si entró otra en su nombre) y la
 * deja enviar de nuevo. Solo mientras esa urna sigue abierta.
 */
export async function resetBallotAction(formData: FormData): Promise<void> {
  const event = await editableEvent();
  const parsed = resetSchema.safeParse({ id: formData.get("id"), phase: formData.get("phase") });
  if (!event || !parsed.success) return;
  await discardBallot({ eventId: event.id, participantId: parsed.data.id, phase: parsed.data.phase });
  refresh();
}

/** Quita un nombre de la lista; si ya envió en la urna abierta, ese sobre se bota. */
export async function removeGuestAction(formData: FormData): Promise<void> {
  const event = await editableEvent();
  const id = String(formData.get("id") ?? "");
  if (!event || !id) return;
  await removeGuest({ eventId: event.id, participantId: id });
  refresh();
}
