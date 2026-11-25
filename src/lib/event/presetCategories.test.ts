import { describe, expect, it } from "vitest";
import { PRESET_CATEGORIES } from "./presetCategories";
import { categorySchema } from "./schemas";

describe("las 25 categorías de Premios del Grupo", () => {
  it("son 13 de premio y 12 honoríficas, y todas pasan la validación del panel", () => {
    expect(PRESET_CATEGORIES.filter((c) => c.type === "PRIZE")).toHaveLength(13);
    expect(PRESET_CATEGORIES.filter((c) => c.type === "HONORARY")).toHaveLength(12);
    for (const c of PRESET_CATEGORIES) {
      expect(categorySchema.safeParse({ ...c, allowExternal: false }).success).toBe(true);
    }
  });

  it("el orden de la ceremonia va del 1 al 25 sin repetir, con EOTY al final", () => {
    const order = PRESET_CATEGORIES.map((c) => c.revealOrder).sort((a, b) => a - b);
    expect(order).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(PRESET_CATEGORIES.find((c) => c.revealOrder === 25)?.name).toMatch(/EOTY/);
  });

  it("la ceremonia sigue el ritmo 2 premios → honorífica → más propenso (la pregunta va en el cierre)", () => {
    const byReveal = [...PRESET_CATEGORIES].sort((a, b) => a.revealOrder - b.revealOrder);
    for (let block = 0; block < 5; block++) {
      const [a, b, c, d] = byReveal.slice(block * 4, block * 4 + 4);
      expect([a!.type, b!.type, c!.type, d!.type]).toEqual(["PRIZE", "PRIZE", "HONORARY", "HONORARY"]);
      expect(c!.framing).toBe("NORMAL");
      expect(d!.framing).toBe("PRONE");
    }
    expect(byReveal[23]!.framing).toBe("QUESTION");
  });

  it("dentro de cada grupo, el orden de Nominados no se repite", () => {
    for (const type of ["PRIZE", "HONORARY"] as const) {
      const order = PRESET_CATEGORIES.filter((c) => c.type === type).map((c) => c.sortOrder);
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it("parejas en shipeo y dúo; evento sin nominar; frase y profe con texto libre", () => {
    const kind = (name: string) => PRESET_CATEGORIES.find((c) => c.name.includes(name));
    expect(kind("shipeo")?.nomineeKind).toBe("PAIR");
    expect(kind("dúo")?.nomineeKind).toBe("PAIR");
    expect(kind("Evento")?.nomineeKind).toBe("DIRECT");
    expect(kind("frase")).toMatchObject({ nomineeKind: "TEXT", maxPicks: 2, minPicks: 1 });
    expect(kind("profe")).toMatchObject({ nomineeKind: "TEXT", maxPicks: 2, minPicks: 1 });
  });

  it("hasta 3 nombres en las de persona, una pareja en las de parejas y todas obligatorias menos Evento", () => {
    for (const c of PRESET_CATEGORIES) {
      if (c.nomineeKind === "PERSON") expect(c.maxPicks).toBe(3);
      if (c.nomineeKind === "PAIR") expect(c.maxPicks).toBe(1);
      expect(c.minPicks).toBe(c.nomineeKind === "DIRECT" ? 0 : 1);
    }
  });

  it("cada categoría trae su criterio (y cabe en el panel)", () => {
    for (const c of PRESET_CATEGORIES) {
      expect(c.description.length).toBeGreaterThan(40);
      expect(c.description.length).toBeLessThanOrEqual(400);
    }
  });
});
