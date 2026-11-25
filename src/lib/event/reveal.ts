// Orden de la ceremonia (CLAUDE.md §3, paso 4). Lo decide el organizador para
// todas las categorías (`revealOrder`); activar o quitar una de la votación no
// lo cambia: la ceremonia solo se salta las que no participan.

export interface RevealItem {
  id: string;
  name: string;
  revealOrder: number;
  sortOrder: number;
}

/** El orden guardado (si dos empatan, manda el orden de categorías). */
export function revealSequence(items: RevealItem[]): string[] {
  return [...items].sort((a, b) => a.revealOrder - b.revealOrder || a.sortOrder - b.sortOrder).map((i) => i.id);
}

/**
 * Orden de fábrica: las categorías de Premios del Grupo en el orden que trae el
 * preset (se reconocen por nombre); las que agregó el organizador van después,
 * en el orden en que estaban.
 */
export function presetRevealOrder(items: RevealItem[], presets: { name: string; revealOrder: number }[]): string[] {
  const presetOrder = new Map(presets.map((p) => [p.name, p.revealOrder]));
  const known = items.filter((i) => presetOrder.has(i.name)).sort((a, b) => presetOrder.get(a.name)! - presetOrder.get(b.name)!);
  const extra = revealSequence(items.filter((i) => !presetOrder.has(i.name)));
  return [...known.map((i) => i.id), ...extra];
}

/** ¿El orden nuevo trae exactamente las mismas categorías, sin repetir ni faltar? */
export function isFullOrder(order: string[], ids: string[]): boolean {
  return order.length === ids.length && new Set(order).size === order.length && ids.every((id) => order.includes(id));
}

/** Mueve un elemento a otra posición (para el editor del orden). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
