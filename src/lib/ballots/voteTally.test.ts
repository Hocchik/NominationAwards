import { describe, expect, it } from "vitest";
import type { VoteBallot } from "./vote";
import { tallyVotes } from "./voteTally";

const ballot = (votes: Record<string, string | null>): VoteBallot => ({ v: 1, kind: "vote", receipt: "AAA-BBB", votes });
const categories = [
  { id: "c1", finalistIds: ["a", "b", "c"] },
  { id: "c2", finalistIds: ["x", "y"] },
];

describe("conteo de la votación", () => {
  it("gana quien tiene más votos, con su porcentaje redondeado", () => {
    const [c1] = tallyVotes(
      [ballot({ c1: "a" }), ballot({ c1: "a" }), ballot({ c1: "b" })],
      categories,
    );
    expect(c1).toEqual({ categoryId: "c1", winnerIds: ["a"], winnerPercent: 67 });
  });

  it("en empate hay ganadores compartidos", () => {
    const [c1] = tallyVotes([ballot({ c1: "a" }), ballot({ c1: "b" }), ballot({ c1: "c" }), ballot({ c1: "b" }), ballot({ c1: "a" })], categories);
    expect(c1.winnerIds.sort()).toEqual(["a", "b"]);
    expect(c1.winnerPercent).toBe(40);
  });

  it("las abstenciones no cuentan para el porcentaje", () => {
    const [, c2] = tallyVotes([ballot({ c2: "x" }), ballot({ c2: null }), ballot({ c2: null })], categories);
    expect(c2).toEqual({ categoryId: "c2", winnerIds: ["x"], winnerPercent: 100 });
  });

  it("ignora votos a quien no es finalista de esa categoría", () => {
    const [c1] = tallyVotes([ballot({ c1: "x" }), ballot({ c1: "b" })], categories);
    expect(c1.winnerIds).toEqual(["b"]);
  });

  it("sin votos válidos no hay ganador", () => {
    const [c1] = tallyVotes([ballot({ c1: null }), ballot({})], categories);
    expect(c1).toEqual({ categoryId: "c1", winnerIds: [], winnerPercent: null });
  });
});
