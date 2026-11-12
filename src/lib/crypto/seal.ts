import "client-only";

import { padPayload } from "./padding";
import { fromBase64, getSodium, toBase64 } from "./sodium";

/**
 * Cifra una papeleta en el navegador con crypto_box_seal (sobre sellado):
 * cualquiera con la llave pública puede sellar, solo el dueño de la privada
 * puede abrir. El remitente queda anónimo: no se usa ninguna llave suya.
 *
 * Devuelve el texto cifrado en base64; siempre mide lo mismo para un mismo
 * `targetBytes` (ver padding.ts).
 */
export async function sealPayload(
  payload: Record<string, unknown>,
  publicKey: string,
  targetBytes: number,
): Promise<string> {
  const s = await getSodium();
  const padded = padPayload(payload, targetBytes);
  const sealed = s.crypto_box_seal(s.from_string(padded), fromBase64(s, publicKey));
  return toBase64(s, sealed);
}
