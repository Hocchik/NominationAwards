import { generateReceiptCode } from "@/lib/ballots/receipt";
import type { VoteBallot } from "@/lib/ballots/vote";
import type { KeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import type { VoteTable } from "./fixtures";

// Urna del demo: papeletas de amigos ficticios armadas con una tabla fija de
// votos y selladas igual que las reales. Solo corre en el navegador.

/**
 * Convierte la tabla en papeletas: el votante i lleva, en cada categoría, el
 * voto i de esa columna; si la columna ya se acabó, se abstiene. Siempre da
 * los mismos votos; solo cambian los comprobantes.
 */
export function simulatedBallots(
  table: VoteTable,
  voters: number,
  receipt: () => string = generateReceiptCode,
): VoteBallot[] {
  const columns = Object.entries(table).map(
    ([categoryId, counts]) =>
      [categoryId, Object.entries(counts).flatMap(([finalistId, n]) => Array<string>(n).fill(finalistId))] as const,
  );
  return Array.from({ length: voters }, (_, i) => ({
    v: 1 as const,
    kind: "vote" as const,
    receipt: receipt(),
    votes: Object.fromEntries(columns.map(([categoryId, list]) => [categoryId, list[i] ?? null])),
  }));
}

/** Baraja con crypto.getRandomValues: el orden de la urna no delata nada (regla 9). */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Sella las papeletas simuladas, suma la del visitante (si votó) y baraja la urna. */
export async function sealDemoUrn({
  keys,
  table,
  voters,
  ballotBytes,
  extra,
}: {
  keys: KeyPair;
  table: VoteTable;
  voters: number;
  ballotBytes: number;
  /** Voto sellado del visitante, o null si no votó. */
  extra: string | null;
}): Promise<string[]> {
  const sealed = await Promise.all(
    simulatedBallots(table, voters).map((ballot) => sealPayload({ ...ballot }, keys.publicKey, ballotBytes)),
  );
  return shuffle(extra ? [...sealed, extra] : sealed);
}
