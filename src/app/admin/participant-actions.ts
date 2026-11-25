"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { discardBallot, removeGuest } from "@/lib/ballots/record";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { isBefore } from "@/lib/event/phases";
import { canManageParticipants } from "@/lib/event/rules";
import { isSmallJpegDataUrl } from "@/lib/photos";
import type { FormState } from "@/lib/forms";
import { mergeAliases, mergeSearchNames, parseAliases, parseGuestList, searchNamesFor } from "@/lib/participants/guests";
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
  const { guests, invalid } = parseGuestList(text);
  if (guests.length === 0) {
    return {
      ok: false,
      errors: { names: [invalid.length ? "Ningún nombre sirve: deben tener de 2 a 40 caracteres." : "Escribe al menos un nombre."] },
      values: { names: text },
    };
  }

  const existing = await prisma.participant.findMany({
    where: { eventId: event.id },
    select: { id: true, displayName: true, normalizedName: true, aliases: true, searchNames: true },
  });
  const byKey = new Map(existing.map((p) => [p.normalizedName, p]));
  const fresh = guests.filter((g) => !byKey.has(normalizeName(g.name)));
  const repeated = guests.filter((g) => byKey.has(normalizeName(g.name)));
  if (existing.length + fresh.length > event.capacity) {
    return {
      ok: false,
      message: `La lista tendría ${existing.length + fresh.length} nombres y el cupo es ${event.capacity}. Súbelo en Evento o agrega menos.`,
      values: { names: text },
    };
  }

  if (fresh.length) {
    await prisma.participant.createMany({
      data: fresh.map((g) => ({
        eventId: event.id,
        displayName: g.name,
        normalizedName: normalizeName(g.name),
        aliases: g.aliases,
        searchNames: g.searchNames ?? [],
      })),
      skipDuplicates: true,
    });
  }
  // A los que ya estaban se les suman los apodos nuevos.
  let withNewAliases = 0;
  for (const g of repeated) {
    const current = byKey.get(normalizeName(g.name))!;
    const merged = mergeAliases(current.aliases, g.aliases, current.displayName);
    const search = mergeSearchNames(current.searchNames, g.searchNames ?? [], current.displayName, merged);
    if (merged.length === current.aliases.length && search.length === current.searchNames.length) continue;
    await prisma.participant.update({ where: { id: current.id }, data: { aliases: merged, searchNames: search } });
    withNewAliases++;
  }
  refresh();
  const parts = [
    fresh.length ? `Se ${fresh.length === 1 ? "agregó 1 nombre" : `agregaron ${fresh.length} nombres`}.` : "No había nombres nuevos.",
    repeated.length ? `${repeated.length} ya ${repeated.length === 1 ? "estaba" : "estaban"} en la lista.` : "",
    withNewAliases ? `Se sumaron apodos a ${withNewAliases}.` : "",
    invalid.length ? `Se saltó: ${invalid.join(", ")} (muy corto o muy largo).` : "",
  ];
  return { ok: true, message: parts.filter(Boolean).join(" ") };
}

/** Cambia los apodos de un invitado (separados por coma; vacío = sin apodos). */
export async function setAliasesAction(formData: FormData): Promise<void> {
  const event = await editableEvent();
  const id = String(formData.get("id") ?? "");
  if (!event || !id) return;
  const guest = await prisma.participant.findFirst({ where: { id, eventId: event.id } });
  if (!guest) return;
  const { aliases } = parseAliases(String(formData.get("aliases") ?? ""), guest.displayName);
  const searchNames = formData.has("searchNames")
    ? searchNamesFor(String(formData.get("searchNames") ?? ""), guest.displayName, aliases)
    : guest.searchNames;
  await prisma.participant.update({ where: { id: guest.id }, data: { aliases, searchNames } });
  refresh();
}

const resetSchema = z.object({ id: z.string().min(1), phase: z.enum(["NOMINATION", "VOTE"]) });

/**
 * Bota el sobre de una persona sin abrirlo (si entró otra en su nombre) y la
 * deja enviar de nuevo. Solo mientras esa urna sigue abierta.
 */
export async function resetBallotAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const event = await editableEvent();
  const parsed = resetSchema.safeParse({ id: formData.get("id"), phase: formData.get("phase") });
  if (!event || !parsed.success) return { ok: false, message: "La lista ya no se puede modificar." };
  const result = await discardBallot({ eventId: event.id, participantId: parsed.data.id, phase: parsed.data.phase });
  refresh();
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message:
      result.reason === "closed"
        ? "Esa urna ya cerró: los sobres perdieron el nombre y ya no se puede resetear (regla de anonimato)."
        : "No se encontró su sobre: puede que ya se haya reseteado. Recarga la página.",
  };
}

/** Quita un nombre de la lista; si ya envió en la urna abierta, ese sobre se bota. */
export async function removeGuestAction(formData: FormData): Promise<void> {
  const event = await editableEvent();
  const id = String(formData.get("id") ?? "");
  if (!event || !id) return;
  await removeGuest({ eventId: event.id, participantId: id });
  refresh();
}

/**
 * Foto de un invitado (se puede subir cuando quieras, hasta la ceremonia). Se
 * usa en el buscador de Nominar, Nominados, Votar y la ceremonia; `null` la quita.
 */
export async function setGuestPhotoAction(id: string, photoUrl: string | null): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !isBefore(event.phase, "CEREMONY")) return { ok: false, message: "En la ceremonia ya no se cambian las fotos." };
  if (photoUrl !== null && !isSmallJpegDataUrl(photoUrl)) return { ok: false, message: "La foto no tiene el formato esperado." };
  const guest = await prisma.participant.findFirst({ where: { id, eventId: event.id } });
  if (!guest) return { ok: false, message: "Ese nombre ya no está en la lista." };
  await prisma.participant.update({ where: { id: guest.id }, data: { photoUrl } });
  refresh();
  return { ok: true };
}
