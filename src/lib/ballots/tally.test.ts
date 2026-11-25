import { describe, expect, it } from "vitest";
import type { NominationBallot, Nominee } from "./nomination";
import { applyMerges, countMerged, pickFinalists, resolveMerge, splitAtCut, tallyNominations, textEntries } from "./tally";

// Tests obligatorios de CLAUDE.md §12: tally y pickFinalists.

const ext = (name: string): Nominee => ({ type: "external", name });
const part = (id: string): Nominee => ({ type: "participant", id });
const ballot = (categories: Record<string, Nominee[]>): NominationBallot => ({
  v: 1,
  kind: "nomination",
  categories,
});

const names = { ana: "Ana Prueba", bruno: "Bruno Prueba" };
const person = (id: string) => ({ id, nomineeKind: "PERSON" as const, maxPicks: 5, allowExternal: true });

describe("tallyNominations", () => {
  it("cuenta una vez por papeleta y nominado, por categoría", () => {
    const { counts } = tallyNominations(
      [
        ballot({ c1: [part("ana"), part("ana"), ext("Rosa")] }),
        ballot({ c1: [part("ana")], c2: [part("ana")] }),
      ],
      [person("c1"), person("c2")],
      names,
    );
    expect(counts.c1).toEqual({ "p:ana": 2, "x:rosa": 1 });
    expect(counts.c2).toEqual({ "p:ana": 1 });
  });

  it("los nombres de fuera se agrupan sin importar mayúsculas ni tildes", () => {
    const { counts } = tallyNominations(
      [ballot({ c1: [ext("La Tía Rosa")] }), ballot({ c1: [ext("la tia rosa")] })],
      [person("c1")],
      names,
    );
    expect(counts.c1).toEqual({ "x:la tia rosa": 2 });
  });

  it("ignora categorías y participantes que no existen", () => {
    const { counts, entries } = tallyNominations(
      [ballot({ otra: [ext("X")], c1: [part("fantasma"), part("bruno")] })],
      [person("c1")],
      names,
    );
    expect(counts).toEqual({ c1: { "p:bruno": 1 } });
    expect(Object.keys(entries)).toEqual(["p:bruno"]);
  });
});

describe("parejas y opciones", () => {
  it("una pareja suma igual en cualquier orden y lleva el nombre de los dos", () => {
    const pairs = { id: "c1", nomineeKind: "PAIR" as const, maxPicks: 1, allowExternal: false };
    const { counts, entries } = tallyNominations(
      [ballot({ c1: [{ type: "pair", ids: ["ana", "bruno"] }] }), ballot({ c1: [{ type: "pair", ids: ["bruno", "ana"] }] })],
      [pairs],
      names,
    );
    expect(counts.c1).toEqual({ "pp:ana+bruno": 2 });
    expect(entries["pp:ana+bruno"]).toMatchObject({ name: "Ana Prueba y Bruno Prueba", participantId: "ana", partnerParticipantId: "bruno" });
  });

  it("las opciones cuentan solo si existen", () => {
    const profes = { id: "c1", nomineeKind: "OPTION" as const, maxPicks: 3, allowExternal: false };
    const { counts, entries } = tallyNominations(
      [ballot({ c1: [{ type: "option", id: "o1" }, { type: "option", id: "nada" }] })],
      [profes],
      names,
      { o1: "Ing. Ramírez" },
    );
    expect(counts.c1).toEqual({ "o:o1": 1 });
    expect(entries["o:o1"]).toMatchObject({ name: "Ing. Ramírez", optionId: "o1" });
  });

  it("una papeleta alterada no cuela otro tipo ni más del máximo", () => {
    const solo = { id: "c1", nomineeKind: "PERSON" as const, maxPicks: 1, allowExternal: false };
    const { counts } = tallyNominations(
      [ballot({ c1: [ext("Rosa"), { type: "option", id: "o1" }, part("ana"), part("bruno")] })],
      [solo],
      names,
      { o1: "Ing. Ramírez" },
    );
    expect(counts.c1).toEqual({ "p:ana": 1 });
  });
});

describe("empate en el corte", () => {
  it("separa los que quedaron arriba de los empatados cuando el empate se pasa del número", () => {
    const counts = { a: 5, b: 4, c: 3, d: 2, e: 2, f: 2, g: 1 };
    expect(splitAtCut(counts, 4)).toEqual({ sure: ["a", "b", "c"], tied: ["d", "e", "f"] });
  });

  it("sin desborde no hay empatados que decidir", () => {
    expect(splitAtCut({ a: 3, b: 2, c: 2, d: 1 }, 3)).toEqual({ sure: ["a", "b", "c"], tied: [] });
    expect(splitAtCut({ a: 1, b: 1 }, 4)).toEqual({ sure: ["a", "b"], tied: [] });
  });

  it("si todos empatan, nadie queda fijo", () => {
    expect(splitAtCut({ a: 1, b: 1, c: 1, d: 1, e: 1 }, 4)).toEqual({ sure: [], tied: ["a", "b", "c", "d", "e"] });
  });
});

describe("texto libre (frases, profes)", () => {
  it("al unir variantes, una papeleta que escribió las dos cuenta una sola vez", () => {
    const profes = { id: "c1", nomineeKind: "TEXT" as const, maxPicks: 2, allowExternal: false };
    const tally = tallyNominations(
      [
        ballot({ c1: [{ type: "text", text: "Ramírez" }, { type: "text", text: "Ing. Ramírez" }] }),
        ballot({ c1: [{ type: "text", text: "Ing. Ramírez" }] }),
        ballot({ c1: [{ type: "text", text: "Miss Carmen" }] }),
      ],
      [profes],
      names,
    );
    const merges = { "t:ramirez": "t:ing. ramirez" };
    expect(countMerged(tally, "c1", merges)).toEqual({ "t:ing. ramirez": 2, "t:miss carmen": 1 });
    expect(pickFinalists(countMerged(tally, "c1", merges), 1)).toEqual(["t:ing. ramirez"]);
    // Sin unir, cada variante cuenta por su lado.
    expect(countMerged(tally, "c1", {})).toEqual({ "t:ramirez": 1, "t:ing. ramirez": 2, "t:miss carmen": 1 });
  });

  it("junta textos iguales sin importar mayúsculas y los entrega en orden alfabético, sin conteos", () => {
    const frases = { id: "c1", nomineeKind: "TEXT" as const, maxPicks: 2, allowExternal: false };
    const tally = tallyNominations(
      [
        ballot({ c1: [{ type: "text", text: "Ya fue" }, { type: "text", text: "A la grande" }] }),
        ballot({ c1: [{ type: "text", text: "ya fue" }] }),
      ],
      [frases],
      names,
    );
    expect(textEntries(tally, "c1").map((e) => e.name)).toEqual(["A la grande", "Ya fue"]);
  });

  it("en las de finalistas directos no se cuenta nada", () => {
    const evento = { id: "c1", nomineeKind: "DIRECT" as const, maxPicks: 1, allowExternal: false };
    const { counts } = tallyNominations([ballot({ c1: [{ type: "option", id: "o1" }] })], [evento], names, { o1: "Paseo" });
    expect(counts.c1).toEqual({});
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
