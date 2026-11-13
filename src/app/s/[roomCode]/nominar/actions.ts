"use server";

import { prisma } from "@/lib/db";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import { recordBallot } from "@/lib/ballots/record";
import { isBase64, sealedBase64Length } from "@/lib/ballots/sealedSize";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";

// El servidor nunca ve qué se nominó: recibe la papeleta ya sellada en el
// navegador. Solo comprueba quién envía (para marcar ✔ una sola vez) y que el
// texto cifrado tenga el tamaño fijo del evento (regla 5).

export interface SubmitResult {
  ok: boolean;
  message?: string;
}

export async function submitNominationAction(
  roomCode: string,
  ciphertext: string,
): Promise<SubmitResult> {
  const event = await getEventByRoomCode(roomCode);
  if (!event) return { ok: false, message: "Esta sala no existe." };

  const participant = await getSessionParticipant(event.id);
  if (!participant) {
    return { ok: false, message: "Tu sesión terminó. Vuelve a entrar a la sala con tu PIN." };
  }

  const categoryCount = await prisma.category.count({ where: { eventId: event.id } });
  const expected = sealedBase64Length(nominationBallotBytes(categoryCount, event.maxNominations));
  if (typeof ciphertext !== "string" || ciphertext.length !== expected || !isBase64(ciphertext)) {
    return { ok: false, message: "La papeleta no tiene el formato esperado. Recarga la página." };
  }

  const result = await recordBallot({
    eventId: event.id,
    participantId: participant.id,
    phase: "NOMINATION",
    ciphertext,
  });
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "closed"
          ? "Las nominaciones ya cerraron."
          : "Ya enviaste tus nominaciones (solo se puede una vez).",
    };
  }
  return { ok: true };
}
