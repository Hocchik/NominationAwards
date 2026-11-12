import { describe, expect, it } from "vitest";
import { type RevealItem, insertIntoReveal, suggestedRevealOrder } from "./reveal";

const item = (id: string, type: RevealItem["type"], sortOrder: number): RevealItem => ({ id, type, sortOrder });

describe("orden de revelación", () => {
  it("sugiere honoríficas primero y premios al final, respetando el orden de categorías", () => {
    const items = [item("p2", "PRIZE", 3), item("h1", "HONORARY", 2), item("p1", "PRIZE", 0), item("h0", "HONORARY", 1)];
    expect(suggestedRevealOrder(items)).toEqual(["h0", "h1", "p1", "p2"]);
  });

  it("una honorífica nueva entra al final de las honoríficas", () => {
    const current = [item("h1", "HONORARY", 0), item("p1", "PRIZE", 1)];
    expect(insertIntoReveal(current, item("h2", "HONORARY", 2))).toEqual(["h1", "h2", "p1"]);
  });

  it("si no hay honoríficas, la nueva va antes de los premios", () => {
    expect(insertIntoReveal([item("p1", "PRIZE", 1)], item("h1", "HONORARY", 0))).toEqual(["h1", "p1"]);
  });

  it("un premio nuevo va al final, sin desordenar lo que ya se acomodó", () => {
    const current = [item("p2", "PRIZE", 2), item("h1", "HONORARY", 0)];
    expect(insertIntoReveal(current, item("p1", "PRIZE", 1))).toEqual(["p2", "h1", "p1"]);
  });
});
