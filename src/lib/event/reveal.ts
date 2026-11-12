import type { CategoryType } from "@/generated/prisma/enums";

// Orden de revelación en la ceremonia (CLAUDE.md §3, paso 4). Por defecto,
// las honoríficas primero y las de premio al final, para cerrar en alto.

export interface RevealItem {
  id: string;
  type: CategoryType;
  sortOrder: number;
}

/** Orden sugerido: honoríficas y después premios, cada grupo en su orden de categorías. */
export function suggestedRevealOrder(items: RevealItem[]): string[] {
  const byOrder = (a: RevealItem, b: RevealItem) => a.sortOrder - b.sortOrder;
  return [
    ...items.filter((i) => i.type === "HONORARY").sort(byOrder),
    ...items.filter((i) => i.type === "PRIZE").sort(byOrder),
  ].map((i) => i.id);
}

/**
 * Inserta una categoría recién activada sin desordenar lo que el admin ya
 * acomodó: una honorífica va al final de las honoríficas; un premio, al final.
 */
export function insertIntoReveal(current: RevealItem[], added: RevealItem): string[] {
  const ids = current.map((i) => i.id);
  if (added.type === "PRIZE") return [...ids, added.id];
  const lastHonorary = current.map((i) => i.type).lastIndexOf("HONORARY");
  const firstPrize = current.findIndex((i) => i.type === "PRIZE");
  const at = lastHonorary >= 0 ? lastHonorary + 1 : firstPrize >= 0 ? firstPrize : ids.length;
  return [...ids.slice(0, at), added.id, ...ids.slice(at)];
}
