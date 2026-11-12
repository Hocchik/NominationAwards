// crypto_box_seal agrega 48 bytes (llave efímera de 32 + MAC de 16) al mensaje.
export const SEAL_OVERHEAD_BYTES = 48;

/** Largo exacto en base64 de una papeleta sellada de `paddedBytes` bytes. */
export function sealedBase64Length(paddedBytes: number): number {
  return 4 * Math.ceil((paddedBytes + SEAL_OVERHEAD_BYTES) / 3);
}

export function isBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}
