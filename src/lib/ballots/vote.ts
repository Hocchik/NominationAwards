import { z } from "zod";

// Papeleta de votación final (CLAUDE.md §6). Puro: se usa en el navegador al
// votar y en la ceremonia para leerla.

export interface VoteBallot {
  v: 1;
  kind: "vote";
  /** categoryId → finalistId, o null si se abstuvo (cuando el evento lo permite). */
  votes: Record<string, string | null>;
}

export interface VoteCategory {
  id: string;
  finalistIds: string[];
}

/**
 * Tamaño fijo de las papeletas de voto de un evento: 1 KB alcanza para unas
 * once categorías; con más, crece de a 1 KB. Depende solo de cuántas
 * categorías están activas, que se congelan al abrir la votación (regla 5).
 */
export function voteBallotBytes(activeCategoryCount: number): number {
  const BASE = 128; // {"v":1,"kind":"vote","votes":{},"pad":""}, con holgura
  const PER_CATEGORY = 80; // "<uuid>":"<uuid>",
  return Math.max(1024, Math.ceil((BASE + activeCategoryCount * PER_CATEGORY) / 1024) * 1024);
}

/** Problemas por categoría (id → mensaje). Sin problemas = se puede sellar. */
export function validateVotes(
  votes: Record<string, string | null | undefined>,
  categories: VoteCategory[],
  allowAbstention: boolean,
): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const category of categories) {
    const choice = votes[category.id];
    if (choice === undefined) {
      issues[category.id] = allowAbstention ? "Elige un finalista o «Me abstengo»." : "Elige un finalista.";
    } else if (choice === null) {
      if (!allowAbstention) issues[category.id] = "En esta votación no se permite abstenerse.";
    } else if (!category.finalistIds.includes(choice)) {
      issues[category.id] = "Esa opción ya no es válida. Elige de nuevo.";
    }
  }
  return issues;
}

export function buildVoteBallot(
  votes: Record<string, string | null | undefined>,
  categoryIds: string[],
): VoteBallot {
  return {
    v: 1,
    kind: "vote",
    votes: Object.fromEntries(categoryIds.map((id) => [id, votes[id] ?? null])),
  };
}

/** Para leer papeletas ya abiertas (ceremonia, Fase 7). */
export const voteBallotSchema = z.object({
  v: z.literal(1),
  kind: z.literal("vote"),
  votes: z.record(z.string(), z.string().nullable()),
});
