import { cleanDisplayName, normalizeName } from "./names";
import { displayNameSchema } from "./schemas";

// Lista de invitados (CLAUDE.md §5): el admin pega los nombres, uno por línea.

export interface ParsedGuests {
  /** Nombres listos para agregar, limpios y sin repetirse entre sí. */
  names: string[];
  /** Líneas que no sirven como nombre (muy cortas o muy largas). */
  invalid: string[];
}

/** Viñeta o número al inicio de una línea pegada: «1. », «2) », «- », «• ». */
const LIST_MARKER = /^\s*(?:[-*•·]|\d+[.)-])\s*/;

/**
 * Convierte lo que pegó el admin en nombres. Ignora líneas vacías, quita
 * viñetas o números del inicio y descarta repetidos sin distinguir mayúsculas
 * ni tildes («José» y «jose» son el mismo).
 */
export function parseGuestList(text: string): ParsedGuests {
  const names: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanDisplayName(raw.replace(LIST_MARKER, ""));
    if (!line) continue;
    const parsed = displayNameSchema.safeParse(line);
    if (!parsed.success) {
      invalid.push(line);
      continue;
    }
    const key = normalizeName(parsed.data);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(parsed.data);
  }
  return { names, invalid };
}
