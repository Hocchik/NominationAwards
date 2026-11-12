// Nombres de participantes (CLAUDE.md §5): únicos por evento sin distinguir
// mayúsculas ni tildes, para que "José" y "jose" no se registren dos veces.
// Ojo: "Juan" y "Juancho" sí son distintos; eso lo decide el admin al aprobar.

/** Limpia lo que escribió la persona: sin espacios sobrantes. Es lo que se muestra. */
export function cleanDisplayName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Clave para detectar duplicados: minúsculas, sin tildes ni diéresis y con los
 * espacios normalizados. La ñ se conserva: "Peña" y "Pena" son personas distintas.
 */
export function normalizeName(raw: string): string {
  return cleanDisplayName(raw)
    .toLowerCase()
    .replace(/ñ/g, "\u0000") // se aparta la ñ para que NFD no la convierta en n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0000/g, "ñ");
}
