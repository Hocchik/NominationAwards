import type { CategoryFraming, NomineeKind } from "@/generated/prisma/enums";

// Cómo se lee y se nomina cada categoría (decisión del usuario, 2026-11-21):
// títulos normales, «Más propenso/a a…» y preguntas; personas, parejas u
// opciones del organizador. Siempre gana uno.

export const PRONE_KICKER = "Más propenso/a a";

/** Título completo para listas y avisos: «Más propenso/a a volverse gay». */
export function categoryTitle(category: { name: string; framing?: CategoryFraming | null }): string {
  return category.framing === "PRONE" ? `${PRONE_KICKER} ${category.name}` : category.name;
}

/** Rótulo chico que va sobre el título grande (solo en «Más propenso/a a»). */
export function categoryKicker(category: { framing?: CategoryFraming | null }): string | null {
  return category.framing === "PRONE" ? PRONE_KICKER : null;
}

export const FRAMING_LABEL: Record<CategoryFraming, string> = {
  NORMAL: "Normal",
  PRONE: "Más propenso/a a…",
  QUESTION: "Pregunta",
};

export const NOMINEE_KIND_LABEL: Record<NomineeKind, string> = {
  PERSON: "Una persona",
  PAIR: "Una pareja",
  OPTION: "Opciones que cargas tú",
  TEXT: "Texto libre",
  DIRECT: "Finalistas que pones tú",
};

/** Qué se le pide a quien nomina: «Elige 1 nombre», «Elige hasta 3 opciones»… */
export function pickInstruction(kind: NomineeKind, maxPicks: number, minPicks = 0): string {
  const n = Math.max(1, maxPicks);
  if (kind === "TEXT") {
    if (minPicks >= 1) return n === 1 ? "Escribe 1 (obligatorio)" : `Escribe al menos 1 y hasta ${n} (obligatorio)`;
    return n === 1 ? "Escribe 1 o ninguno: es opcional" : `Escribe hasta ${n}, o ninguno: es opcional`;
  }
  if (kind === "PAIR") {
    if (n === 1) return "Elige una pareja (dos nombres)";
    return minPicks >= 1 ? `Elige de 1 a ${n} parejas (puedes repetir a alguien con otra persona)` : `Elige hasta ${n} parejas`;
  }
  if (kind === "OPTION") return n === 1 ? "Elige una opción" : `Elige hasta ${n} opciones`;
  if (n === 1) return "Elige un nombre";
  return minPicks >= 1 ? `Elige de 1 a ${n} nombres` : `Elige hasta ${n} nombres`;
}
