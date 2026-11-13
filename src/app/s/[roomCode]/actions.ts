"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { normalizeName } from "@/lib/participants/names";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { endParticipantSession, startParticipantSession } from "@/lib/participants/session";

// Entrada a la sala con la lista de invitados (CLAUDE.md §5): cada uno toca su
// nombre y entra, sin PIN. Si alguien entra con el nombre de otro, el admin ve
// ese nombre bloqueado en su panel y puede botar su sobre (regla 2).

const NO_ROOM: FormState = { ok: false, message: "Esta sala no existe." };

export async function enterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const event = await getEventByRoomCode(String(formData.get("roomCode") ?? ""));
  if (!event) return NO_ROOM;
  if (event.phase === "SETUP") return { ok: false, message: "La sala todavía no abre." };

  const name = String(formData.get("name") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { eventId_normalizedName: { eventId: event.id, normalizedName: normalizeName(name) } },
  });
  if (!participant) {
    return { ok: false, message: "Ese nombre ya no está en la lista. Habla con el organizador." };
  }

  await startParticipantSession(participant);
  refresh();
  return { ok: true };
}

export async function logoutParticipantAction(): Promise<void> {
  await endParticipantSession();
  refresh();
}
