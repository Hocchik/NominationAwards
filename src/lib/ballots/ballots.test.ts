import { describe, expect, it } from "vitest";
import { padPayload } from "@/lib/crypto/padding";
import {
  EXTERNAL_NAME_MAX,
  TEXT_MAX,
  type Nominee,
  addNominee,
  buildNominationBallot,
  cleanExternalName,
  makePair,
  nominationBallotBytes,
  nominationBallotSchema,
  validateNominations,
} from "./nomination";
import { isBase64, sealedBase64Length } from "./sealedSize";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const candidates = [
  { id: uuid(1), name: "Ana Prueba" },
  { id: uuid(2), name: "José Pérez" },
];

describe("tamaño fijo de la papeleta de nominación", () => {
  it("cabe el peor caso: todas las casillas con nombres externos del largo máximo", () => {
    for (const [categories, max] of [[1, 1], [12, 5], [20, 5], [30, 10]] as const) {
      const ugly = '€"\\'.repeat(EXTERNAL_NAME_MAX).slice(0, EXTERNAL_NAME_MAX); // 3 bytes y escapes
      const selections: Record<string, Nominee[]> = {};
      const ids = Array.from({ length: categories }, (_, i) => uuid(100 + i));
      for (const id of ids) {
        selections[id] = Array.from({ length: max }, () => ({ type: "external", name: ugly }));
      }
      const ballot = buildNominationBallot(selections, ids);
      const bytes = nominationBallotBytes(ids.map(() => ({ nomineeKind: "PERSON" as const, maxPicks: max, allowExternal: true })));
      expect(() => padPayload({ ...ballot }, bytes)).not.toThrow();
      expect(bytes % 1024).toBe(0);
    }
  });

  it("cabe el peor caso con parejas y opciones (las 25 categorías del evento)", () => {
    const kinds = [
      ...Array.from({ length: 21 }, () => ({ nomineeKind: "PERSON" as const, maxPicks: 1, allowExternal: false })),
      { nomineeKind: "PAIR" as const, maxPicks: 1, allowExternal: false },
      { nomineeKind: "PAIR" as const, maxPicks: 1, allowExternal: false },
      { nomineeKind: "OPTION" as const, maxPicks: 3, allowExternal: false },
      { nomineeKind: "OPTION" as const, maxPicks: 1, allowExternal: false },
    ];
    const ids = kinds.map((_, i) => uuid(200 + i));
    const selections: Record<string, Nominee[]> = {};
    kinds.forEach((k, i) => {
      selections[ids[i]] = Array.from({ length: k.maxPicks }, (_, j): Nominee =>
        k.nomineeKind === "PAIR"
          ? makePair(uuid(300 + j), uuid(400 + j))
          : k.nomineeKind === "OPTION"
            ? { type: "option", id: uuid(500 + j) }
            : { type: "participant", id: uuid(600 + j) },
      );
    });
    const bytes = nominationBallotBytes(kinds);
    expect(() => padPayload({ ...buildNominationBallot(selections, ids) }, bytes)).not.toThrow();
  });

  it("cabe el peor caso con frases largas (texto libre) y no cuenta las de finalistas directos", () => {
    const kinds = [
      { nomineeKind: "TEXT" as const, maxPicks: 2, allowExternal: false },
      { nomineeKind: "DIRECT" as const, maxPicks: 1, allowExternal: false },
    ];
    const ugly = '€"\\'.repeat(TEXT_MAX).slice(0, TEXT_MAX);
    const ids = [uuid(700), uuid(701)];
    const ballot = buildNominationBallot({ [ids[0]]: [{ type: "text", text: ugly }, { type: "text", text: ugly + "x" }] }, ids);
    expect(() => padPayload({ ...ballot }, nominationBallotBytes(kinds))).not.toThrow();
    expect(nominationBallotBytes([kinds[1]!])).toBe(nominationBallotBytes([]));
  });

  it("dos papeletas distintas del mismo evento miden lo mismo", () => {
    const kinds = [
      { nomineeKind: "PERSON" as const, maxPicks: 1, allowExternal: false },
      { nomineeKind: "PAIR" as const, maxPicks: 1, allowExternal: false },
    ];
    const bytes = nominationBallotBytes(kinds);
    const ids = [uuid(1), uuid(2)];
    const a = padPayload({ ...buildNominationBallot({ [ids[0]]: [{ type: "participant", id: uuid(9) }] }, ids) }, bytes);
    const b = padPayload({ ...buildNominationBallot({ [ids[1]]: [makePair(uuid(7), uuid(8))] }, ids) }, bytes);
    expect(a.length).toBe(b.length);
  });

  it("el servidor puede calcular el largo exacto del texto cifrado", () => {
    expect(sealedBase64Length(1024)).toBe(4 * Math.ceil((1024 + 48) / 3));
    expect(isBase64("QUJD+/9=")).toBe(true);
    expect(isBase64("no es base64!")).toBe(false);
  });
});

describe("armar la lista de una categoría", () => {
  it("no repite a la misma persona", () => {
    let list: Nominee[] = [];
    list = addNominee(list, { type: "participant", id: uuid(1) }, candidates);
    list = addNominee(list, { type: "participant", id: uuid(1) }, candidates);
    expect(list).toHaveLength(1);
  });

  it("un nombre «de fuera» que es del grupo se guarda como esa persona", () => {
    const list = addNominee([], { type: "external", name: "  jose   perez " }, candidates);
    expect(list).toEqual([{ type: "participant", id: uuid(2) }]);
  });

  it("no repite externos aunque cambien mayúsculas o tildes", () => {
    let list: Nominee[] = [];
    list = addNominee(list, { type: "external", name: "La Tía Rosa" }, candidates);
    list = addNominee(list, { type: "external", name: "la tia rosa" }, candidates);
    expect(list).toEqual([{ type: "external", name: "La Tía Rosa" }]);
  });

  it("una pareja es la misma sin importar el orden, y nadie forma pareja consigo mismo", () => {
    let list: Nominee[] = [];
    list = addNominee(list, { type: "pair", ids: [uuid(2), uuid(1)] }, candidates);
    list = addNominee(list, makePair(uuid(1), uuid(2)), candidates);
    expect(list).toEqual([{ type: "pair", ids: [uuid(1), uuid(2)] }]);
    expect(addNominee([], { type: "pair", ids: [uuid(1), uuid(1)] }, candidates)).toEqual([]);
  });

  it("no repite el mismo texto aunque cambien mayúsculas, y limpia espacios", () => {
    let list: Nominee[] = [];
    list = addNominee(list, { type: "text", text: "  Ing.   Ramírez " }, candidates);
    list = addNominee(list, { type: "text", text: "ing. ramirez" }, candidates);
    expect(list).toEqual([{ type: "text", text: "Ing. Ramírez" }]);
  });

  it("no repite la misma opción", () => {
    let list: Nominee[] = [];
    list = addNominee(list, { type: "option", id: uuid(5) }, candidates);
    list = addNominee(list, { type: "option", id: uuid(5) }, candidates);
    expect(list).toHaveLength(1);
  });

  it("limpia caracteres invisibles y recorta el largo", () => {
    expect(cleanExternalName("Ro\u0000sa​ ")).toBe("Rosa");
    expect(cleanExternalName("x".repeat(80))).toHaveLength(EXTERNAL_NAME_MAX);
  });
});

describe("reglas de nominación", () => {
  const ids = [uuid(10), uuid(11)];
  const three: Nominee[] = [1, 2, 3].map((n) => ({ type: "external", name: `Persona ${n}` }));

  const cats = [
    { id: ids[0], maxPicks: 3 },
    { id: ids[1], maxPicks: 1 },
  ];

  it("cada categoría tiene su máximo", () => {
    expect(validateNominations({ [ids[0]]: three, [ids[1]]: three.slice(0, 1) }, cats, true)).toEqual({});
    expect(validateNominations({ [ids[1]]: three.slice(0, 2) }, cats, true)).toHaveProperty(ids[1]);
  });

  it("una categoría obligatoria pide al menos uno aunque las demás sean opcionales", () => {
    const withRequired = [...cats, { id: uuid(12), maxPicks: 2, minPicks: 1 }];
    expect(validateNominations({ [ids[0]]: three }, withRequired, true)).toHaveProperty(uuid(12));
    expect(validateNominations({ [ids[0]]: three, [uuid(12)]: three.slice(0, 1) }, withRequired, true)).toEqual({});
  });

  it("con categorías opcionales igual hay que nominar en alguna", () => {
    expect(validateNominations({}, cats, true)).toHaveProperty("_all");
  });

  it("con categorías obligatorias, todas necesitan al menos uno", () => {
    const issues = validateNominations({ [ids[0]]: three }, cats, false);
    expect(Object.keys(issues)).toEqual([ids[1]]);
  });

  it("la papeleta solo incluye categorías con nombres y se puede volver a leer", () => {
    const mixed: Nominee[] = [...three, makePair(uuid(1), uuid(2)), { type: "option", id: uuid(3) }];
    const ballot = buildNominationBallot({ [ids[0]]: mixed, [ids[1]]: [] }, ids);
    expect(Object.keys(ballot.categories)).toEqual([ids[0]]);
    expect(nominationBallotSchema.parse(JSON.parse(JSON.stringify(ballot)))).toEqual(ballot);
  });
});
