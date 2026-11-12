import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Participant } from "@/generated/prisma/client";
import { sign, unsign } from "@/lib/auth/sign";
import { prisma } from "@/lib/db";

// Sesión del participante (CLAUDE.md §5): cookie httpOnly firmada para no
// pedir el PIN cada vez en el mismo dispositivo. Sirve para saber quién nomina
// o vota (y marcar hasNominated / hasVoted), nunca para ligarlo a su papeleta.

const COOKIE_NAME = "participant_session";
const SESSION_DAYS = 30;
const PREFIX = "p";

/**
 * Marca derivada del hash del PIN: si el admin restablece el PIN o la persona
 * crea uno nuevo, las sesiones abiertas en otros dispositivos dejan de valer.
 */
function pinTag(pinHash: string): string {
  return createHash("sha256").update(pinHash).digest("base64url").slice(0, 12);
}

export async function startParticipantSession(participant: Participant): Promise<void> {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = Date.now() + maxAge * 1000;
  const value = [PREFIX, participant.id, pinTag(participant.pinHash), expiresAt].join(":");
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
  const [prefix, participantId, tag, expires] = value?.split(":") ?? [];
  if (prefix !== PREFIX || !participantId || !tag) return null;

  await connection(); // la hora y la base se consultan en cada petición
  if (!(Number(expires) > Date.now())) return null;

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return null;
  if (participant.pinReset || pinTag(participant.pinHash) !== tag) return null;
  return participant;
}
