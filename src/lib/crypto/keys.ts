import "client-only";

import { fromBase64, getSodium, toBase64 } from "./sodium";

// Llaves del notario (CLAUDE.md §2 y §4): se generan en SU navegador. La
// pública se sube al servidor para cifrar papeletas; la privada solo vive en
// memoria y en el archivo que el notario descarga.

/** Par de llaves de crypto_box (X25519), en base64. */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const s = await getSodium();
  const pair = s.crypto_box_keypair();
  return { publicKey: toBase64(s, pair.publicKey), privateKey: toBase64(s, pair.privateKey) };
}

/** true si la llave privada es la que corresponde a la pública. */
export async function keyPairMatches(pair: KeyPair): Promise<boolean> {
  const s = await getSodium();
  try {
    const derived = s.crypto_scalarmult_base(fromBase64(s, pair.privateKey));
    return s.memcmp(derived, fromBase64(s, pair.publicKey));
  } catch {
    return false; // base64 inválido o largo incorrecto
  }
}
