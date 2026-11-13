import { describe, expect, it } from "vitest";
import { generateKeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import { openAndTallyVotes } from "./openVotes";
import { voteBallotBytes } from "./vote";

const categories = [{ id: "cat", finalistIds: ["a", "b"] }];
const bytes = voteBallotBytes(1);
const vote = (choice: string | null) => ({ v: 1, kind: "vote", votes: { cat: choice } });

describe("openAndTallyVotes", () => {
  it("abre, cuenta y dice cuántos votaron", async () => {
    const keys = await generateKeyPair();
    const ciphertexts = await Promise.all([vote("a"), vote("a"), vote("b"), vote(null)].map((b) => sealPayload(b, keys.publicKey, bytes)));
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.byCategory.cat?.winnerIds).toEqual(["a"]);
    expect(results.count).toBe(4);
    expect(results.unreadable).toBe(0);
  });

  it("cuenta aparte lo que no se puede abrir o no es un voto", async () => {
    const keys = await generateKeyPair();
    const other = await generateKeyPair();
    const ciphertexts = [
      await sealPayload(vote("b"), keys.publicKey, bytes),
      await sealPayload(vote("a"), other.publicKey, bytes), // sellado con otra llave
      await sealPayload({ v: 1, kind: "nomination", categories: {} }, keys.publicKey, bytes), // no es un voto
    ];
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.unreadable).toBe(2);
    expect(results.count).toBe(1);
    expect(results.byCategory.cat?.winnerIds).toEqual(["b"]);
  });
});
