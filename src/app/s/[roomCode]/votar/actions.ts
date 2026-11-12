"use server";

import { prisma } from "@/lib/db";
import { isReceiptCode } from "@/lib/ballots/receipt";
import { recordBallot } from "@/lib/ballots/record";
import { isBase64, sealedBase64Length } from "@/lib/ballots/sealedSize";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";

// Igual que en las nominaciones: el servidor recibe el voto ya sellado en el
// navegador y solo comprueba quién vota (una vez) y el tamaño fijo (regla 5).

export interface SubmitResult {
  ok: boolean;
  message?: string;
}

export async function submitVoteAction(
  roomCode: string,
  ciphertext: string,
  receiptCode: string,
): Promise<SubmitResult> {
  // getEventByRoomCode aplica el horario: si la votación ya cerró, la fase
  // cambia aquí mismo y recordBallot rechaza el voto.
  const event = await getEventByRoomCode(roomCode);
  if (!event) return { ok: false, message: "Esta sala no existe." };

  const participant = await getSessionParticipant(event.id);
  if (!participant) {
    return { ok: false, message: "Tu sesión terminó. Vuelve a entrar a la sala con tu PIN." };
  }
  if (participant.status !== "APPROVED") {
    return { ok: false, message: "Tu registro no está aprobado." };
  }
  if (!isReceiptCode(receiptCode)) {
    return { ok: false, message: "El comprobante no tiene el formato esperado." };
  }

  const active = await prisma.category.count({ where: { eventId: event.id, activeForVote: true } });
  const expected = sealedBase64Length(voteBallotBytes(active));
  if (typeof ciphertext !== "string" || ciphertext.length !== expected || !isBase64(ciphertext)) {
    return { ok: false, message: "El voto no tiene el formato esperado. Recarga la página." };
  }

  const result = await recordBallot({
    eventId: event.id,
    participantId: participant.id,
    phase: "VOTE",
    ciphertext,
    receiptCode,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.reason === "closed" ? "La votación no está abierta." : "Ya votaste (solo se puede una vez).",
    };
  }
  return { ok: true };
}
