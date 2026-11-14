import { cleanDisplayName, normalizeName } from "./names";
import { displayNameSchema } from "./schemas";

// Lista de invitados (CLAUDE.md §5): el admin pega los nombres, uno por línea,
// con los apodos entre paréntesis: «Gabriel Mendoza (Gabo, Gabito)». La
// tarjeta muestra el nombre real; el buscador de la sala también encuentra
// los apodos.

export interface GuestEntry {
  name: string;
  aliases: string[];
}

export interface ParsedGuests {
  /** Invitados listos para agregar, limpios y sin repetirse entre sí. */
  guests: GuestEntry[];
  /** Líneas o apodos que no sirven (muy cortos o muy largos). */
  invalid: string[];
}

/** Viñeta o número al inicio de una línea pegada: «1. », «2) », «- », «• ». */
const LIST_MARKER = /^\s*(?:[-*•·]|\d+[.)-])\s*/;
/** Apodos al final de la línea, entre paréntesis. */
const ALIASES = /\(([^()]*)\)\s*$/;

/**
 * Limpia una lista de apodos separados por coma: sin repetidos (sin
 * distinguir mayúsculas ni tildes) y sin el propio nombre.
 */
export function parseAliases(text: string, name = ""): { aliases: string[]; invalid: string[] } {
  const aliases: string[] = [];
  const invalid: string[] = [];
  const seen = new Set([normalizeName(name)]);
  for (const raw of text.split(",")) {
    const alias = cleanDisplayName(raw);
    if (!alias) continue;
    const parsed = displayNameSchema.safeParse(alias);
    if (!parsed.success) {
      invalid.push(alias);
      continue;
    }
    const key = normalizeName(parsed.data);
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(parsed.data);
  }
  return { aliases, invalid };
}

/**
 * Convierte lo que pegó el admin en invitados. Ignora líneas vacías, quita
 * viñetas o números del inicio y junta repetidos sin distinguir mayúsculas
 * ni tildes («José» y «jose» son el mismo; sus apodos se suman).
 */
export function parseGuestList(text: string): ParsedGuests {
  const guests: GuestEntry[] = [];
  const invalid: string[] = [];
  const byKey = new Map<string, GuestEntry>();
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(LIST_MARKER, "");
    const aliasMatch = line.match(ALIASES);
    if (aliasMatch) line = line.slice(0, aliasMatch.index);
    line = cleanDisplayName(line);
    if (!line) continue;
    const parsed = displayNameSchema.safeParse(line);
    if (!parsed.success) {
      invalid.push(line);
      continue;
    }
    const name = parsed.data;
    const { aliases, invalid: badAliases } = parseAliases(aliasMatch?.[1] ?? "", name);
    invalid.push(...badAliases);
    const key = normalizeName(name);
    const existing = byKey.get(key);
    if (existing) {
      existing.aliases = mergeAliases(existing.aliases, aliases, existing.name);
      continue;
    }
    const entry = { name, aliases };
    byKey.set(key, entry);
    guests.push(entry);
  }
  return { guests, invalid };
}

/** Suma apodos nuevos a los que ya tenía, sin repetir ni incluir el nombre. */
export function mergeAliases(current: string[], extra: string[], name: string): string[] {
  return parseAliases([...current, ...extra].join(","), name).aliases;
}

/** ¿El texto buscado coincide con el nombre o con algún apodo? */
export function matchesGuest(guest: GuestEntry, query: string): { match: boolean; alias?: string } {
  const q = normalizeName(query);
  if (!q) return { match: true };
  if (normalizeName(guest.name).includes(q)) return { match: true };
  const alias = guest.aliases.find((a) => normalizeName(a).includes(q));
  return alias ? { match: true, alias } : { match: false };
}
