import { describe, expect, it } from "vitest";
import type { VoteBallot } from "./vote";
import { tallyVotes } from "./voteTally";

const ballot = (votes: Record<string, string | null>): VoteBallot => ({ v: 1, kind: "vote", votes });
const categories = [
  { id: "c1", finalistIds: ["a", "b", "c"] },
  { id: "c2", finalistIds: ["x", "y"] },
];
const votesFor = (category: string, ...choices: string[]) => choices.map((choice) => ballot({ [category]: choice }));

describe("conteo de la votación", () => {
  it("gana quien tiene más votos, con su porcentaje redondeado", () => {
    const [c1] = tallyVotes(votesFor("c1", "a", "a", "b"), categories);
    expect(c1).toEqual({ categoryId: "c1", winnerIds: ["a"], winnerPercent: 67, places: { b: 2 } });
  });

  it("en empate hay ganadores compartidos", () => {
    const [c1] = tallyVotes(votesFor("c1", "a", "b", "c", "b", "a"), categories);
    expect(c1.winnerIds.sort()).toEqual(["a", "b"]);
    expect(c1.winnerPercent).toBe(40);
  });

  it("las abstenciones no cuentan para el porcentaje", () => {
    const [, c2] = tallyVotes([ballot({ c2: "x" }), ballot({ c2: null }), ballot({ c2: null })], categories);
    expect(c2).toEqual({ categoryId: "c2", winnerIds: ["x"], winnerPercent: 100, places: {} });
  });

  it("ignora votos a quien no es finalista de esa categoría", () => {
    const [c1] = tallyVotes([ballot({ c1: "x" }), ballot({ c1: "b" })], categories);
    expect(c1.winnerIds).toEqual(["b"]);
  });

  it("sin votos válidos no hay ganador ni puestos", () => {
    const [c1] = tallyVotes([ballot({ c1: null }), ballot({})], categories);
    expect(c1).toEqual({ categoryId: "c1", winnerIds: [], winnerPercent: null, places: {} });
  });
});

describe("puestos 2.º a 4.º (regla 8: sin conteos)", () => {
  const five = [{ id: "k", finalistIds: ["a", "b", "c", "d", "e"] }];

  it("ordena al resto por votos: 2.º, 3.º y 4.º", () => {
    const [k] = tallyVotes(votesFor("k", "a", "a", "a", "a", "b", "b", "b", "c", "c", "d"), five);
    expect(k.winnerIds).toEqual(["a"]);
    expect(k.places).toEqual({ b: 2, c: 3, d: 4 });
  });

  it("quien tuvo 0 votos no recibe puesto", () => {
    const [k] = tallyVotes(votesFor("k", "a", "a", "b"), five);
    expect(k.places).toEqual({ b: 2 });
    expect(k.places).not.toHaveProperty("c");
  });

  it("los empates comparten puesto y el siguiente salta", () => {
    const [k] = tallyVotes(votesFor("k", "a", "a", "a", "b", "b", "c", "c", "d"), five);
    expect(k.places).toEqual({ b: 2, c: 2, d: 4 });
  });

  it("con ganadores empatados, el siguiente queda 3.º", () => {
    const [k] = tallyVotes(votesFor("k", "a", "a", "b", "b", "c"), five);
    expect(k.winnerIds.sort()).toEqual(["a", "b"]);
    expect(k.places).toEqual({ c: 3 });
  });

  it("no pasa del 4.º puesto", () => {
    const [k] = tallyVotes(votesFor("k", "a", "a", "a", "a", "a", "b", "b", "b", "b", "c", "c", "c", "d", "d", "e"), five);
    expect(k.places).toEqual({ b: 2, c: 3, d: 4 });
    expect(k.places).not.toHaveProperty("e");
  });
});
