import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Firma de valores con HMAC-SHA256 y SESSION_SECRET. Sirve para cookies de
// sesión: el valor viaja en claro (no guardar secretos en él), pero nadie
// puede alterarlo sin invalidar la firma.

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Falta SESSION_SECRET o es muy corto (mínimo 32 caracteres, ver .env.example).");
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/** Devuelve "valor.firma". */
export function sign(value: string): string {
  return `${value}.${hmac(value)}`;
}

/** Devuelve el valor original si la firma es válida, o null si fue alterado. */
export function unsign(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = token.slice(0, dot);
  return safeEqual(token.slice(dot + 1), hmac(value)) ? value : null;
}

/**
 * Compara dos textos en tiempo constante. Se comparan sus hashes para que
 * tengan el mismo largo y el tiempo de respuesta no delate cuánto coinciden.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
