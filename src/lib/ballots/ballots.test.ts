import { describe, expect, it } from "vitest";
import { padPayload } from "@/lib/crypto/padding";
import {
  EXTERNAL_NAME_MAX,
  type Nominee,
  addNominee,
  buildNominationBallot,
  cleanExternalName,
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
      const bytes = nominationBallotBytes(categories, max);
      expect(() => padPayload({ ...ballot }, bytes)).not.toThrow();
      expect(bytes % 1024).toBe(0);
    }
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

  it("limpia caracteres invisibles y recorta el largo", () => {
    expect(cleanExternalName("Ro\u0000sa​ ")).toBe("Rosa");
    expect(cleanExternalName("x".repeat(80))).toHaveLength(EXTERNAL_NAME_MAX);
  });
});

describe("reglas de nominación", () => {
  const ids = [uuid(10), uuid(11)];
  const three: Nominee[] = [1, 2, 3].map((n) => ({ type: "external", name: `Persona ${n}` }));

  it("con categorías opcionales: vacía o entre el mínimo y el máximo", () => {
    const rules = { min: 3, max: 5, allowSkip: true };
    expect(validateNominations({ [ids[0]]: three }, ids, rules)).toEqual({});
    expect(validateNominations({ [ids[0]]: three.slice(0, 2) }, ids, rules)).toHaveProperty(ids[0]);
  });

  it("con categorías opcionales igual hay que nominar en alguna", () => {
    expect(validateNominations({}, ids, { min: 3, max: 5, allowSkip: true })).toHaveProperty("_all");
  });

  it("con categorías obligatorias, todas necesitan el mínimo", () => {
    const issues = validateNominations({ [ids[0]]: three }, ids, { min: 3, max: 5, allowSkip: false });
    expect(Object.keys(issues)).toEqual([ids[1]]);
  });

  it("la papeleta solo incluye categorías con nombres y se puede volver a leer", () => {
    const ballot = buildNominationBallot({ [ids[0]]: three, [ids[1]]: [] }, ids);
    expect(Object.keys(ballot.categories)).toEqual([ids[0]]);
    expect(nominationBallotSchema.parse(JSON.parse(JSON.stringify(ballot)))).toEqual(ballot);
  });
});
