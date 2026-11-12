"use server";

import { prisma } from "@/lib/db";
import { hashSetupToken, isPublicKey, looksLikeSetupToken } from "@/lib/notary";

export interface NotaryResult {
  ok: boolean;
  message?: string;
}

/**
 * Guarda las llaves PÚBLICAS del notario. El notario no tiene cuenta: el token
 * del link es su credencial y deja de valer en cuanto se usa. Las llaves
 * privadas nunca pasan por aquí (CLAUDE.md §4, regla 7).
 */
export async function submitNotaryKeysAction(
  token: string,
  nominationPublicKey: string,
  votePublicKey: string,
): Promise<NotaryResult> {
  if (!looksLikeSetupToken(token)) {
    return { ok: false, message: "Este link no es válido." };
  }
  if (!isPublicKey(nominationPublicKey) || !isPublicKey(votePublicKey)) {
    return { ok: false, message: "Las llaves públicas no tienen el formato esperado." };
  }
  if (nominationPublicKey === votePublicKey) {
    return { ok: false, message: "Las dos llaves deben ser distintas." };
  }

  const hash = hashSetupToken(token);
  // Una sola operación: solo guarda si el link sigue vigente, el evento está
  // en preparación y no hay llaves todavía. Dos envíos a la vez: gana uno.
  const result = await prisma.event.updateMany({
    where: {
      notarySetupTokenHash: hash,
      phase: "SETUP",
      nominationPublicKey: null,
      votePublicKey: null,
    },
    data: { nominationPublicKey, votePublicKey, notarySetupTokenHash: null },
  });
  if (result.count !== 1) {
    return {
      ok: false,
      message: "Este link ya se usó o fue reemplazado. Pide al organizador uno nuevo.",
    };
  }
  return { ok: true };
}
