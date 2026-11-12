// Padding de papeletas (regla de anonimato 5): antes de cifrar, cada papeleta
// se rellena hasta un tamaño fijo. Así todos los textos cifrados miden lo mismo
// y el largo no delata cuántas personas nominó alguien ni qué nombres escribió.

export const NOMINATION_BALLOT_BYTES = 4096;
export const VOTE_BALLOT_BYTES = 1024;

const encoder = new TextEncoder();

function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Convierte el payload en JSON de exactamente `targetBytes` bytes (UTF-8),
 * agregando un campo `pad` al final. Lanza un error si no cabe.
 */
export function padPayload(payload: Record<string, unknown>, targetBytes: number): string {
  if ("pad" in payload) {
    throw new Error("La papeleta no puede traer su propio campo «pad».");
  }
  const withoutPadding = JSON.stringify({ ...payload, pad: "" });
  const missing = targetBytes - byteLength(withoutPadding);
  if (missing < 0) {
    throw new Error(
      `La papeleta ocupa ${byteLength(withoutPadding)} bytes y el máximo es ${targetBytes}.`,
    );
  }
  // "0" ocupa 1 byte en UTF-8: el resultado mide exactamente targetBytes.
  return JSON.stringify({ ...payload, pad: "0".repeat(missing) });
}

/** Revierte padPayload: devuelve el payload sin el campo `pad`. */
export function unpadPayload<T>(json: string): T {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  delete parsed.pad;
  return parsed as T;
}
