import "server-only";

import { randomInt } from "node:crypto";

// Sin letras ni números que se confunden al dictarlos o leerlos (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código corto y aleatorio del evento (antes iba en el link de la sala; ahora la sala es la raíz y solo nombra borradores). */
export function generateRoomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
