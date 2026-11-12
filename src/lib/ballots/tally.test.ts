import { describe, expect, it } from "vitest";
import type { NominationBallot, Nominee } from "./nomination";
import { applyMerges, pickFinalists, resolveMerge, tallyNominations } from "./tally";

// Tests obligatorios de CLAUDE.md §12: tally y pickFinalists.

const ext = (name: string): Nominee => ({ type: "external", name });
const part = (id: string): Nominee => ({ type: "participant", id });
const ballot = (categories: Record<string, Nominee[]>): NominationBallot => ({
  v: 1,
  kind: "nomination",
  receipt: "AAA-BBB",
  categories,
});

const names = { ana: "Ana Prueba", bruno: "Bruno Prueba" };

describe("tallyNominations", () => {
  it("cuenta una vez por papeleta y nominado, por categoría", () => {
    const { counts } = tallyNominations(
      [
        ballot({ c1: [part("ana"), part("ana"), ext("Rosa")] }),
        ballot({ c1: [part("ana")], c2: [part("ana")] }),
      ],
      ["c1", "c2"],
      names,
    );
    expect(counts.c1).toEqual({ "p:ana": 2, "x:rosa": 1 });
    expect(counts.c2).toEqual({ "p:ana": 1 });
  });

  it("los nombres de fuera se agrupan sin importar mayúsculas ni tildes", () => {
    const { counts } = tallyNominations(
      [ballot({ c1: [ext("La Tía Rosa")] }), ballot({ c1: [ext("la tia rosa")] })],
      ["c1"],
      names,
    );
    expect(counts.c1).toEqual({ "x:la tia rosa": 2 });
  });

  it("ignora categorías y participantes que no existen", () => {
    const { counts, entries } = tallyNominations(
      [ballot({ otra: [ext("X")], c1: [part("fantasma"), part("bruno")] })],
      ["c1"],
      names,
    );
    expect(counts).toEqual({ c1: { "p:bruno": 1 } });
    expect(Object.keys(entries)).toEqual(["p:bruno"]);
  });
});

describe("unificar nombres", () => {
  it("los nombres unidos suman correctamente", () => {
    const merges = { "x:tia rosa": "x:la tia rosa", "x:rosita": "x:tia rosa" };
    expect(applyMerges({ "x:la tia rosa": 2, "x:tia rosa": 1, "x:rosita": 1, "p:ana": 3 }, merges)).toEqual({
      "x:la tia rosa": 4,
      "p:ana": 3,
    });
  });

  it("un nombre de fuera se puede unir con alguien del grupo", () => {
    expect(applyMerges({ "x:anita": 2, "p:ana": 1 }, { "x:anita": "p:ana" })).toEqual({ "p:ana": 3 });
  });

  it("no queda en un bucle si alguien une en círculo", () => {
    expect(resolveMerge("x:a", { "x:a": "x:b", "x:b": "x:a" })).toBe("x:b");
  });
});

describe("pickFinalists", () => {
  it("toma los N más nominados", () => {
    expect(pickFinalists({ a: 5, b: 4, c: 3, d: 1 }, 2).sort()).toEqual(["a", "b"]);
  });

  it("si hay empate en el último puesto, entran todos los empatados", () => {
    expect(pickFinalists({ a: 5, b: 3, c: 3, d: 3, e: 1 }, 2).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("si hay menos nominados que cupos, entran todos", () => {
    expect(pickFinalists({ a: 1, b: 1 }, 4).sort()).toEqual(["a", "b"]);
    expect(pickFinalists({}, 4)).toEqual([]);
  });
});
