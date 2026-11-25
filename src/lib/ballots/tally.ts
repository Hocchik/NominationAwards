import type { NomineeKind } from "@/generated/prisma/enums";
import { normalizeName } from "@/lib/participants/names";
import type { NominationBallot, Nominee } from "./nomination";

// Conteo del cierre de nominaciones (CLAUDE.md §3, paso 3). Corre SOLO en el
// navegador donde el notario cargó su llave: los conteos viven en memoria,
// nunca se muestran ni se guardan (regla 8). Al servidor solo van finalistas.

/**
 * Identidad de un nominado: "p:<id>" alguien del grupo, "x:<nombre normalizado>"
 * de fuera, "pp:<id>+<id>" una pareja y "o:<id>" una opción del organizador.
 */
export type NomineeKey = string;

export interface NomineeEntry {
  key: NomineeKey;
  name: string;
  participantId: string | null;
  /** La otra mitad de una pareja. */
  partnerParticipantId: string | null;
  /** Opción del organizador (profe, evento, frase). */
  optionId: string | null;
}

export function nomineeKey(nominee: Nominee): NomineeKey {
  switch (nominee.type) {
    case "participant":
      return `p:${nominee.id}`;
    case "external":
      return `x:${normalizeName(nominee.name)}`;
    case "pair": {
      const [a, b] = [...nominee.ids].sort();
      return `pp:${a}+${b}`;
    }
    case "option":
      return `o:${nominee.id}`;
    case "text":
      return `t:${normalizeName(nominee.text)}`;
  }
}

/** Lo que el conteo necesita saber de cada categoría. */
export interface TallyCategory {
  id: string;
  nomineeKind: NomineeKind;
  maxPicks: number;
  allowExternal: boolean;
}

/** Textos libres de una categoría (sin conteos), en orden alfabético: el organizador agrupa las variantes. */
export function textEntries(tally: Tally, categoryId: string): NomineeEntry[] {
  return Object.keys(tally.counts[categoryId] ?? {})
    .filter((key) => key.startsWith("t:"))
    .map((key) => tally.entries[key]!)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export interface Tally {
  /** categoryId → (nominado → cuántas papeletas lo nominaron en esa categoría) */
  counts: Record<string, Record<NomineeKey, number>>;
  /**
   * categoryId → lo que puso cada papeleta (sin autor y en orden aleatorio). Hace
   * falta para unificar bien: si una papeleta escribió «Ramírez» e «Ing. Ramírez»,
   * al unirlos debe contar una sola vez.
   */
  picks: Record<string, NomineeKey[][]>;
  /** Todos los nominados distintos, con el nombre que se muestra. */
  entries: Record<NomineeKey, NomineeEntry>;
}

/** Nombre de una pareja: los dos en orden alfabético, unidos con «y». */
export function pairName(a: string, b: string): string {
  return [a, b].sort((x, y) => x.localeCompare(y, "es")).join(" y ");
}

/** ¿Este nominado puede ir en esta categoría? (una papeleta alterada no puede colar otro tipo) */
function fits(nominee: Nominee, category: TallyCategory): boolean {
  switch (category.nomineeKind) {
    case "PERSON":
      return nominee.type === "participant" || (nominee.type === "external" && category.allowExternal);
    case "PAIR":
      return nominee.type === "pair";
    case "OPTION":
      return nominee.type === "option";
    case "TEXT":
      return nominee.type === "text";
    case "DIRECT":
      return false; // no se nomina
  }
}

/**
 * Suma las papeletas. Cada papeleta cuenta como máximo una vez por nominado y
 * categoría (aunque viniera repetido), solo hasta el máximo de la categoría,
 * y se ignoran categorías, personas u opciones desconocidas.
 */
export function tallyNominations(
  ballots: NominationBallot[],
  categories: TallyCategory[],
  participantNames: Record<string, string>,
  optionLabels: Record<string, string> = {},
): Tally {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const counts: Tally["counts"] = Object.fromEntries(categories.map((c) => [c.id, {}]));
  const picks: Tally["picks"] = Object.fromEntries(categories.map((c) => [c.id, []]));
  const entries: Tally["entries"] = {};

  for (const ballot of ballots) {
    for (const [categoryId, nominees] of Object.entries(ballot.categories)) {
      const category = byId.get(categoryId);
      if (!category) continue;
      const seen = new Set<NomineeKey>();
      for (const nominee of nominees) {
        if (seen.size >= Math.max(1, category.maxPicks)) break;
        if (!fits(nominee, category)) continue;
        const key = nomineeKey(nominee);
        if (seen.has(key)) continue;
        const entry = describe(nominee, key, participantNames, optionLabels);
        if (!entry) continue;
        seen.add(key);
        counts[categoryId][key] = (counts[categoryId][key] ?? 0) + 1;
        entries[key] ??= entry;
      }
      if (seen.size) picks[categoryId].push([...seen]);
    }
  }
  return { counts, picks, entries };
}

/**
 * Cuenta una categoría con los nombres ya unificados: cada papeleta suma como
 * máximo 1 por nominado final, aunque haya escrito dos variantes que se unieron.
 */
export function countMerged(tally: Tally, categoryId: string, merges: Record<NomineeKey, NomineeKey>): Record<NomineeKey, number> {
  const counts: Record<NomineeKey, number> = {};
  for (const ballot of tally.picks[categoryId] ?? []) {
    for (const key of new Set(ballot.map((k) => resolveMerge(k, merges)))) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

function describe(
  nominee: Nominee,
  key: NomineeKey,
  participantNames: Record<string, string>,
  optionLabels: Record<string, string>,
): NomineeEntry | null {
  const base = { key, participantId: null, partnerParticipantId: null, optionId: null };
  switch (nominee.type) {
    case "participant":
      return nominee.id in participantNames ? { ...base, name: participantNames[nominee.id], participantId: nominee.id } : null;
    case "external":
      return { ...base, name: nominee.name.trim() };
    case "pair": {
      const [a, b] = [...nominee.ids].sort();
      if (a === b || !(a in participantNames) || !(b in participantNames)) return null;
      return { ...base, name: pairName(participantNames[a], participantNames[b]), participantId: a, partnerParticipantId: b };
    }
    case "option":
      return nominee.id in optionLabels ? { ...base, name: optionLabels[nominee.id], optionId: nominee.id } : null;
    case "text": {
      const text = nominee.text.replace(/\s+/g, " ").trim();
      return text.length >= 2 ? { ...base, name: text } : null;
    }
  }
}

/**
 * Sigue las uniones hasta el nombre final ("Tía Rosa" → "La tía Rosa" →
 * Rosa del grupo). Ignora ciclos para no quedar en un bucle.
 */
export function resolveMerge(key: NomineeKey, merges: Record<NomineeKey, NomineeKey>): NomineeKey {
  const visited = new Set<NomineeKey>([key]);
  let current = key;
  while (merges[current] && !visited.has(merges[current])) {
    current = merges[current];
    visited.add(current);
  }
  return current;
}

/**
 * Aplica la unificación de nombres: los votos de los nombres unidos se suman.
 * Dentro de una categoría, si una papeleta nominó a "Tía Rosa" y otra a "La
 * tía Rosa", al unirlas la persona suma 2.
 */
export function applyMerges(
  counts: Record<NomineeKey, number>,
  merges: Record<NomineeKey, NomineeKey>,
): Record<NomineeKey, number> {
  const merged: Record<NomineeKey, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    const target = resolveMerge(key, merges);
    merged[target] = (merged[target] ?? 0) + count;
  }
  return merged;
}

/**
 * Separa los finalistas seguros de los empatados en el corte, cuando el empate
 * del último puesto hace pasar de `n`: `sure` quedaron claramente arriba y
 * `tied` comparten el último puesto. Sin desborde, `tied` va vacío y `sure` es
 * lo mismo que `pickFinalists`. El organizador decide qué hacer con `tied`
 * (entran todos, elige cuáles o se queda con `sure`) sin ver conteos.
 */
export function splitAtCut(counts: Record<NomineeKey, number>, n: number): { sure: NomineeKey[]; tied: NomineeKey[] } {
  const picked = pickFinalists(counts, n);
  if (picked.length <= n) return { sure: picked, tied: [] };
  const cutoff = Math.min(...picked.map((key) => counts[key]!));
  return {
    sure: picked.filter((key) => counts[key]! > cutoff),
    tied: picked.filter((key) => counts[key] === cutoff),
  };
}

/**
 * Los `n` más nominados. Si hay empate en el último puesto, entran todos los
 * empatados (CLAUDE.md §3), así que pueden salir más de `n`.
 */
export function pickFinalists(counts: Record<NomineeKey, number>, n: number): NomineeKey[] {
  const ranked = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length <= n) return ranked.map(([key]) => key);
  const cutoff = ranked[n - 1][1];
  return ranked.filter(([, count]) => count >= cutoff).map(([key]) => key);
}
