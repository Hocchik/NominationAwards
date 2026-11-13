import type { KeyPair } from "@/lib/crypto/keys";
import { openPayload } from "@/lib/crypto/open";
import { type VoteBallot, type VoteCategory, voteBallotSchema } from "./vote";
import { type CategoryResult, tallyVotes } from "./voteTally";

// Abre y cuenta la urna de la votación. Corre SOLO en el navegador de la
// ceremonia (la real y la del demo): la llave vive en memoria (regla 7) y de
// aquí salen solo los ganadores y cuántos votaron, nunca conteos (regla 8).

export interface VoteResults {
  byCategory: Record<string, CategoryResult>;
  /** Cuántas papeletas se abrieron (= cuántas personas votaron). */
  count: number;
  /** Papeletas que no se pudieron abrir o no tienen forma de voto. */
  unreadable: number;
}

export async function openAndTallyVotes(
  ciphertexts: string[],
  keys: KeyPair,
  categories: VoteCategory[],
): Promise<VoteResults> {
  const ballots: VoteBallot[] = [];
  let unreadable = 0;
  for (const ciphertext of ciphertexts) {
    try {
      const result = voteBallotSchema.safeParse(await openPayload(ciphertext, keys));
      if (result.success) ballots.push(result.data);
      else unreadable++;
    } catch {
      unreadable++;
    }
  }
  const tallies = tallyVotes(ballots, categories);
  return {
    byCategory: Object.fromEntries(tallies.map((t) => [t.categoryId, t])),
    count: ballots.length,
    unreadable,
  };
}
