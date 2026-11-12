import type { VoteBallot, VoteCategory } from "./vote";

// Conteo de la votación final (CLAUDE.md §8). Corre SOLO en el navegador de la
// ceremonia, con la llave del notario cargada en memoria. Los conteos nunca se
// muestran: solo el ganador (o ganadores, si empatan) y, si el evento lo
// permite, su porcentaje redondeado (regla 8).

export interface CategoryResult {
  categoryId: string;
  /** Ids de los ganadores: más de uno si empatan; vacío si nadie votó. */
  winnerIds: string[];
  /** % de los votos válidos (sin abstenciones) que obtuvo cada ganador, redondeado. */
  winnerPercent: number | null;
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
    if (total === 0) return { categoryId: category.id, winnerIds: [], winnerPercent: null };
    const top = Math.max(...counts.values());
    return {
      categoryId: category.id,
      winnerIds: [...counts].filter(([, n]) => n === top).map(([id]) => id),
      winnerPercent: Math.round((top / total) * 100),
    };
  });
}
