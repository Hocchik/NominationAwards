import { normalizeName } from "@/lib/participants/names";
import type { NominationBallot, Nominee } from "./nomination";

// Conteo del cierre de nominaciones (CLAUDE.md §3, paso 3). Corre SOLO en el
// navegador donde el notario cargó su llave: los conteos viven en memoria,
// nunca se muestran ni se guardan (regla 8). Al servidor solo van finalistas.

/** Identidad de un nominado: "p:<id>" para alguien del grupo, "x:<nombre normalizado>" de fuera. */
export type NomineeKey = string;

export interface NomineeEntry {
  key: NomineeKey;
  name: string;
  participantId: string | null;
}

export function nomineeKey(nominee: Nominee): NomineeKey {
  return nominee.type === "participant" ? `p:${nominee.id}` : `x:${normalizeName(nominee.name)}`;
}

export interface Tally {
  /** categoryId → (nominado → cuántas papeletas lo nominaron en esa categoría) */
  counts: Record<string, Record<NomineeKey, number>>;
  /** Todos los nominados distintos, con el nombre que se muestra. */
  entries: Record<NomineeKey, NomineeEntry>;
}

/**
 * Suma las papeletas. Cada papeleta cuenta como máximo una vez por nominado y
 * categoría (aunque viniera repetido), y se ignoran categorías desconocidas.
 */
export function tallyNominations(
  ballots: NominationBallot[],
  categoryIds: string[],
  participantNames: Record<string, string>,
): Tally {
  const valid = new Set(categoryIds);
  const counts: Tally["counts"] = Object.fromEntries(categoryIds.map((id) => [id, {}]));
  const entries: Tally["entries"] = {};

  for (const ballot of ballots) {
    for (const [categoryId, nominees] of Object.entries(ballot.categories)) {
      if (!valid.has(categoryId)) continue;
      const seen = new Set<NomineeKey>();
      for (const nominee of nominees) {
        const key = nomineeKey(nominee);
        if (seen.has(key)) continue;
        seen.add(key);
        if (nominee.type === "participant" && !(nominee.id in participantNames)) continue;
        counts[categoryId][key] = (counts[categoryId][key] ?? 0) + 1;
        entries[key] ??=
          nominee.type === "participant"
            ? { key, name: participantNames[nominee.id], participantId: nominee.id }
            : { key, name: nominee.name.trim(), participantId: null };
      }
    }
  }
  return { counts, entries };
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
