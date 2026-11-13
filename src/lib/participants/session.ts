import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Participant } from "@/generated/prisma/client";
import { sign, unsign } from "@/lib/auth/sign";
import { prisma } from "@/lib/db";

// Sesión del participante (CLAUDE.md §5): al tocar su nombre en la sala queda
// una cookie httpOnly firmada para no tener que elegirlo cada vez en el mismo
// celular. Sirve para saber quién nomina o vota (y marcar hasNominated /
// hasVoted); el nombre en el sobre se borra al cerrar la urna (regla 2).

const COOKIE_NAME = "participant_session";
const SESSION_DAYS = 30;
const PREFIX = "p";

/**
 * La cookie lleva el sessionVersion del participante: cuando el admin resetea
 * su envío, el número sube y las sesiones abiertas con ese nombre dejan de valer.
 */
export async function startParticipantSession(participant: Participant): Promise<void> {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = Date.now() + maxAge * 1000;
  const value = [PREFIX, participant.id, participant.sessionVersion, expiresAt].join(":");
  (await cookies()).set(COOKIE_NAME, sign(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function endParticipantSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** El participante con sesión válida en este evento, o null. */
export async function getSessionParticipant(eventId: string): Promise<Participant | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const value = unsign(token);
  const [prefix, participantId, version, expires] = value?.split(":") ?? [];
  if (prefix !== PREFIX || !participantId || version === undefined) return null;

  await connection(); // la hora y la base se consultan en cada petición
  if (!(Number(expires) > Date.now())) return null;

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return null;
  if (String(participant.sessionVersion) !== version) return null;
  return participant;
}
