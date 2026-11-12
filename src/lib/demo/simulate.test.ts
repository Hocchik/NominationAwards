import { describe, expect, it } from "vitest";
import { openAndTallyVotes } from "@/lib/ballots/openVotes";
import { buildVoteBallot, voteBallotBytes } from "@/lib/ballots/vote";
import { generateKeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import { DEMO_CATEGORIES, DEMO_SIMULATED_VOTES, DEMO_VOTERS, leaders } from "./fixtures";
import { sealDemoUrn, shuffle, simulatedBallots } from "./simulate";

const categories = DEMO_CATEGORIES.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) }));
const bytes = voteBallotBytes(DEMO_CATEGORIES.length);
const tied = DEMO_CATEGORIES.find((c) => leaders(DEMO_SIMULATED_VOTES[c.id] ?? {}).length > 1)!;
const tiedLeaders = leaders(DEMO_SIMULATED_VOTES[tied.id]!);

describe("simulatedBallots", () => {
  it("arma una papeleta por votante; si la columna se acaba, se abstiene", () => {
    const ballots = simulatedBallots({ cat: { a: 2, b: 1 } }, 4, () => "AAA-222");
    expect(ballots.map((b) => b.votes.cat)).toEqual(["a", "a", "b", null]);
    expect(ballots.every((b) => b.kind === "vote" && b.receipt === "AAA-222")).toBe(true);
  });

  it("es determinista salvo por los comprobantes", () => {
    const votesOf = () => simulatedBallots(DEMO_SIMULATED_VOTES, DEMO_VOTERS).map((b) => b.votes);
    expect(votesOf()).toEqual(votesOf());
  });
});

describe("shuffle", () => {
  it("no pierde ni repite elementos y no toca la lista original", () => {
    const list = [1, 2, 3, 4, 5];
    expect([...shuffle(list)].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(list).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("urna del demo", () => {
  it("se abre con la función de la ceremonia y da ganadores en todas las categorías", async () => {
    const keys = await generateKeyPair();
    const urn = await sealDemoUrn({ keys, table: DEMO_SIMULATED_VOTES, voters: DEMO_VOTERS, ballotBytes: bytes, extra: null });
    expect(urn).toHaveLength(DEMO_VOTERS);
    const results = await openAndTallyVotes(urn, keys, categories);
    expect(results.unreadable).toBe(0);
    expect(results.receipts).toHaveLength(DEMO_VOTERS);
    for (const c of DEMO_CATEGORIES) expect(results.byCategory[c.id]?.winnerIds.length).toBeGreaterThan(0);
    expect(results.byCategory[tied.id]?.winnerIds).toHaveLength(2); // empate compartido
  });

  it("el voto del visitante desempata y su comprobante aparece en la lista", async () => {
    const keys = await generateKeyPair();
    const mine = buildVoteBallot({ [tied.id]: tiedLeaders[1] }, categories.map((c) => c.id), "TUY-234");
    const extra = await sealPayload({ ...mine }, keys.publicKey, bytes);
    const urn = await sealDemoUrn({ keys, table: DEMO_SIMULATED_VOTES, voters: DEMO_VOTERS, ballotBytes: bytes, extra });
    const results = await openAndTallyVotes(urn, keys, categories);
    expect(results.byCategory[tied.id]?.winnerIds).toEqual([tiedLeaders[1]]);
    expect(results.receipts).toContain("TUY-234");
    expect(results.receipts).toHaveLength(DEMO_VOTERS + 1);
  });
});
