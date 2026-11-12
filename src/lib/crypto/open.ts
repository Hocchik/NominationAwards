import "client-only";

import type { KeyPair } from "./keys";
import { unpadPayload } from "./padding";
import { fromBase64, getSodium } from "./sodium";

/**
 * Abre una papeleta sellada. Se usa SOLO en el navegador del notario (cierre
 * de nominaciones y ceremonia): la llave privada nunca llega al servidor.
 * Lanza un error si la llave no corresponde o el texto fue alterado.
 */
export async function openPayload<T>(ciphertext: string, keys: KeyPair): Promise<T> {
  const s = await getSodium();
  let opened: Uint8Array;
  try {
    opened = s.crypto_box_seal_open(
      fromBase64(s, ciphertext),
      fromBase64(s, keys.publicKey),
      fromBase64(s, keys.privateKey),
    );
  } catch {
    throw new Error(
      "No se pudo abrir la papeleta: la llave no corresponde o el contenido fue alterado.",
    );
  }
  return unpadPayload<T>(s.to_string(opened));
}
