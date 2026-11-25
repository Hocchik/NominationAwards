import { cleanDisplayName, normalizeName } from "./names";
import { displayNameSchema } from "./schemas";

// Lista de invitados (CLAUDE.md §5): el admin pega los nombres, uno por línea,
// con los apodos entre paréntesis y otros nombres para buscar entre corchetes:
// «Gabriel Mendoza (Gabo, el admin) [Armando, Salcedo]». La tarjeta muestra el
// nombre y apellido; el primer apodo se ve como apodo; los corchetes (segundo
// nombre, apellidos) solo sirven para que el buscador lo encuentre.

export interface GuestEntry {
  name: string;
  aliases: string[];
  /** Otros nombres solo para buscar (segundo nombre, apellidos); nunca se muestran como apodo. */
  searchNames?: string[];
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
/** Otros nombres para buscar al final de la línea, entre corchetes. */
const SEARCH = /\[([^[\]]*)\]\s*$/;

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
    // Paréntesis y corchetes pueden venir en cualquier orden al final.
    let aliasText = "";
    let searchText = "";
    for (let i = 0; i < 2; i++) {
      const a = line.match(ALIASES);
      if (a) {
        aliasText = a[1] ?? "";
        line = line.slice(0, a.index);
        continue;
      }
      const s = line.match(SEARCH);
      if (s) {
        searchText = s[1] ?? "";
        line = line.slice(0, s.index);
      }
    }
    line = cleanDisplayName(line);
    if (!line) continue;
    const parsed = displayNameSchema.safeParse(line);
    if (!parsed.success) {
      invalid.push(line);
      continue;
    }
    const name = parsed.data;
    const { aliases, invalid: badAliases } = parseAliases(aliasText, name);
    const searchNames = searchNamesFor(searchText, name, aliases);
    invalid.push(...badAliases);
    const key = normalizeName(name);
    const existing = byKey.get(key);
    if (existing) {
      existing.aliases = mergeAliases(existing.aliases, aliases, existing.name);
      existing.searchNames = mergeSearchNames(existing.searchNames ?? [], searchNames, existing.name, existing.aliases);
      continue;
    }
    const entry = { name, aliases, searchNames };
    byKey.set(key, entry);
    guests.push(entry);
  }
  return { guests, invalid };
}

/** Suma apodos nuevos a los que ya tenía, sin repetir ni incluir el nombre. */
export function mergeAliases(current: string[], extra: string[], name: string): string[] {
  return parseAliases([...current, ...extra].join(","), name).aliases;
}

/**
 * Otros nombres para buscar (segundo nombre, apellidos), separados por coma o
 * espacio: sin repetir, sin palabras que ya están en el nombre ni en los apodos.
 */
export function searchNamesFor(text: string, name: string, aliases: string[] = []): string[] {
  const taken = new Set([...normalizeName(name).split(" "), ...aliases.map(normalizeName)]);
  const out: string[] = [];
  for (const raw of text.split(/[,\s]+/)) {
    const word = cleanDisplayName(raw);
    if (word.length < 2 || word.length > 40) continue;
    const key = normalizeName(word);
    if (taken.has(key)) continue;
    taken.add(key);
    out.push(word);
  }
  return out;
}

export function mergeSearchNames(current: string[], extra: string[], name: string, aliases: string[]): string[] {
  return searchNamesFor([...current, ...extra].join(","), name, aliases);
}

/** ¿El texto buscado coincide con el nombre, un apodo u otro nombre? (se muestra lo que coincidió) */
export function matchesGuest(guest: GuestEntry, query: string): { match: boolean; alias?: string } {
  const q = normalizeName(query);
  if (!q) return { match: true };
  if (normalizeName(guest.name).includes(q)) return { match: true };
  const alias = [...guest.aliases, ...(guest.searchNames ?? [])].find((a) => normalizeName(a).includes(q));
  return alias ? { match: true, alias } : { match: false };
}
