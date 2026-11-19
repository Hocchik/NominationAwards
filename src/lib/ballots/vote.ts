import { z } from "zod";

// Papeleta de votación final (CLAUDE.md §6). Puro: se usa en el navegador al
// votar y en la ceremonia para leerla.

export interface VoteBallot {
  v: 1;
  kind: "vote";
  /** categoryId → finalistId; null solo si en esa categoría no había a quién votar (eras el único finalista). */
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

/**
 * Problemas por categoría (id → mensaje). Sin problemas = se puede sellar.
 * No hay «Me abstengo» (decisión del usuario, 2026-11-19): en cada categoría se
 * vota por alguien. La única excepción es una categoría sin opciones válidas
 * (la persona era su único finalista): ahí no se pide nada.
 */
export function validateVotes(
  votes: Record<string, string | null | undefined>,
  categories: VoteCategory[],
): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const category of categories) {
    if (category.finalistIds.length === 0) continue;
    const choice = votes[category.id];
    if (choice === undefined || choice === null) {
      issues[category.id] = "Elige un finalista.";
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
