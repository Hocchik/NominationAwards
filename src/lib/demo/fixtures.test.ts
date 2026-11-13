import { describe, expect, it } from "vitest";
import { DEMO_CANDIDATES, DEMO_CATEGORIES, byName } from "./fixtures";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const finalists = DEMO_CATEGORIES.flatMap((c) => c.finalists);

describe("datos del demo", () => {
  it("todos los ids son UUID v4 y no se repiten", () => {
    const ids = [...DEMO_CANDIDATES.map((p) => p.id), ...DEMO_CATEGORIES.map((c) => c.id), ...finalists.map((f) => f.id)];
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los finalistas del grupo existen en el grupo y con el mismo nombre", () => {
    const group = new Map(DEMO_CANDIDATES.map((p) => [p.id, p.name]));
    for (const f of finalists.filter((f) => f.participantId !== null)) {
      expect(group.get(f.participantId!)).toBe(f.name);
    }
  });

  it("hay premios, honoríficas y al menos un referente de fuera del grupo", () => {
    expect(DEMO_CATEGORIES.some((c) => c.type === "PRIZE")).toBe(true);
    expect(DEMO_CATEGORIES.some((c) => c.type === "HONORARY")).toBe(true);
    expect(finalists.some((f) => f.participantId === null)).toBe(true);
  });

  it("cada categoría tiene de 3 a 4 finalistas", () => {
    for (const c of DEMO_CATEGORIES) {
      expect(c.finalists.length).toBeGreaterThanOrEqual(3);
      expect(c.finalists.length).toBeLessThanOrEqual(4);
    }
  });

  it("hay nombres del grupo que son finalistas, para ver la tarjeta «Eres tú»", () => {
    expect(finalists.some((f) => f.participantId !== null)).toBe(true);
  });

  it("byName ordena alfabéticamente en español sin tocar la lista original", () => {
    const list = [{ name: "Úrsula" }, { name: "Ana" }, { name: "Óscar" }];
    expect(byName(list).map((x) => x.name)).toEqual(["Ana", "Óscar", "Úrsula"]);
    expect(list[0]!.name).toBe("Úrsula");
  });
});
