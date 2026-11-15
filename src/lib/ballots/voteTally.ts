import type { VoteBallot, VoteCategory } from "./vote";

// Conteo de la votación final (CLAUDE.md §8). Corre SOLO en el navegador de la
// ceremonia, con la llave del notario cargada en memoria. Los conteos nunca se
// muestran: solo el ganador (o ganadores, si empatan), si el evento lo permite
// su porcentaje redondeado, y los puestos 2.º a 4.º sin números (regla 8).

/** Último puesto que se muestra en la ceremonia. */
const LAST_PLACE = 4;

export interface CategoryResult {
  categoryId: string;
  /** Ids de los ganadores: más de uno si empatan; vacío si nadie votó. */
  winnerIds: string[];
  /** % de los votos válidos (sin abstenciones) que obtuvo cada ganador, redondeado. */
  winnerPercent: number | null;
  /**
   * Puesto (2 a 4) del resto de finalistas. Los empates comparten puesto y el
   * siguiente salta (2, 2, 4). Quien tuvo 0 votos no aparece: no se marca.
   */
  places: Record<string, number>;
}

export function tallyVotes(ballots: VoteBallot[], categories: VoteCategory[]): CategoryResult[] {
  return categories.map((category) => {
    const valid = new Set(category.finalistIds);
    const counts = new Map<string, number>();
    for (const ballot of ballots) {
      const choice = ballot.votes[category.id];
      // Abstenciones y opciones que no son finalistas de esta categoría no cuentan.
      if (choice && valid.has(choice)) counts.set(choice, (counts.get(choice) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    if (total === 0) return { categoryId: category.id, winnerIds: [], winnerPercent: null, places: {} };
    const top = Math.max(...counts.values());
    // Puesto de cada uno = 1 + cuántos tuvieron más votos (empates comparten puesto).
    // Solo están en `counts` quienes recibieron al menos un voto.
    const places: Record<string, number> = {};
    for (const [id, n] of counts) {
      if (n === top) continue;
      const place = 1 + [...counts.values()].filter((other) => other > n).length;
      if (place <= LAST_PLACE) places[id] = place;
    }
    return {
      categoryId: category.id,
      winnerIds: [...counts].filter(([, n]) => n === top).map(([id]) => id),
      winnerPercent: Math.round((top / total) * 100),
      places,
    };
  });
}
