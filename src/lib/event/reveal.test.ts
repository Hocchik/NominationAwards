import { describe, expect, it } from "vitest";
import { isFullOrder, moveItem, presetRevealOrder, revealSequence } from "./reveal";

const item = (id: string, name: string, revealOrder: number, sortOrder = 0) => ({ id, name, revealOrder, sortOrder });

describe("orden de la ceremonia", () => {
  it("sigue el orden guardado y desempata con el orden de categorías", () => {
    expect(revealSequence([item("a", "A", 2), item("b", "B", 1), item("c", "C", 1, 5), item("d", "D", 1, 2)])).toEqual(["b", "d", "c", "a"]);
  });

  it("el orden de fábrica pone las del preset en su orden y las agregadas al final", () => {
    const presets = [
      { name: "EOTY", revealOrder: 3 },
      { name: "Chill", revealOrder: 1 },
      { name: "Pepa", revealOrder: 2 },
    ];
    const items = [item("e", "EOTY", 1), item("x", "Nueva", 0), item("c", "Chill", 9), item("p", "Pepa", 4)];
    expect(presetRevealOrder(items, presets)).toEqual(["c", "p", "e", "x"]);
  });

  it("solo acepta un orden con todas las categorías, sin repetir", () => {
    expect(isFullOrder(["b", "a"], ["a", "b"])).toBe(true);
    expect(isFullOrder(["a", "a"], ["a", "b"])).toBe(false);
    expect(isFullOrder(["a"], ["a", "b"])).toBe(false);
    expect(isFullOrder(["a", "c"], ["a", "b"])).toBe(false);
  });

  it("mueve un elemento a otra posición", () => {
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});
