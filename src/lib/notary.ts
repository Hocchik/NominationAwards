import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Link de configuración del notario (CLAUDE.md §2): un token aleatorio de un
// solo uso. En la base solo se guarda su hash: quien lea la base no puede
// armar el link. Al subir las llaves públicas, el hash se borra.

export function createSetupToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSetupToken(token) };
}

export function hashSetupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 bytes en base64url = 43 caracteres. Descarta basura antes de consultar la base. */
export function looksLikeSetupToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * El evento al que pertenece un link de notario todavía usable, o null si el
 * link no existe, ya se usó o el evento salió de la preparación.
 */
export async function getEventForSetupToken(token: string) {
  if (!looksLikeSetupToken(token)) return null;
  const event = await prisma.event.findFirst({
    where: { notarySetupTokenHash: hashSetupToken(token) },
    select: { id: true, name: true, phase: true, nominationPublicKey: true },
  });
  if (!event || event.phase !== "SETUP" || event.nominationPublicKey) return null;
  return { id: event.id, name: event.name };
}

/** Una llave pública de crypto_box: 32 bytes en base64 estándar. */
export function isPublicKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  return Buffer.from(value, "base64").length === 32;
}
