import { describe, expect, it } from "vitest";
import { generateKeyPair } from "@/lib/crypto/keys";
import { sealPayload } from "@/lib/crypto/seal";
import { openAndTallyVotes } from "./openVotes";
import { voteBallotBytes } from "./vote";

const categories = [{ id: "cat", finalistIds: ["a", "b"] }];
const bytes = voteBallotBytes(1);
const vote = (receipt: string, choice: string | null) => ({ v: 1, kind: "vote", receipt, votes: { cat: choice } });

describe("openAndTallyVotes", () => {
  it("abre, cuenta y devuelve los comprobantes en orden alfabético", async () => {
    const keys = await generateKeyPair();
    const ciphertexts = await Promise.all(
      [vote("ZZZ-222", "a"), vote("AAA-333", "a"), vote("MMM-444", "b")].map((b) => sealPayload(b, keys.publicKey, bytes)),
    );
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.byCategory.cat?.winnerIds).toEqual(["a"]);
    expect(results.receipts).toEqual(["AAA-333", "MMM-444", "ZZZ-222"]);
    expect(results.unreadable).toBe(0);
  });

  it("cuenta aparte lo que no se puede abrir o no es un voto", async () => {
    const keys = await generateKeyPair();
    const other = await generateKeyPair();
    const ciphertexts = [
      await sealPayload(vote("AAA-333", "b"), keys.publicKey, bytes),
      await sealPayload(vote("BBB-444", "a"), other.publicKey, bytes), // sellado con otra llave
      await sealPayload({ v: 1, kind: "nomination", receipt: "CCC-555", categories: {} }, keys.publicKey, bytes), // no es un voto
    ];
    const results = await openAndTallyVotes(ciphertexts, keys, categories);
    expect(results.unreadable).toBe(2);
    expect(results.receipts).toEqual(["AAA-333"]);
    expect(results.byCategory.cat?.winnerIds).toEqual(["b"]);
  });
});
