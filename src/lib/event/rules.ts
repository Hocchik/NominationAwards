import type { EventPhase } from "@/generated/prisma/enums";
import { isBefore } from "./phases";

// Qué se puede editar en cada fase. Lo que cambia las reglas del juego se
// congela en cuanto el grupo empieza a participar, para que sea justo para todos.

/** Crear, borrar, cambiar tipo y reordenar categorías; mínimo/máximo de nominaciones. */
export function canEditStructure(phase: EventPhase): boolean {
  return phase === "SETUP";
}

/** Corregir nombre o consigna de una categoría (las papeletas usan su id, no su texto). */
export function canEditCategoryText(phase: EventPhase): boolean {
  return isBefore(phase, "CEREMONY");
}

/** Cuántos finalistas pasan por categoría: se usa al cerrar las nominaciones. */
export function canEditFinalistsCount(phase: EventPhase): boolean {
  return isBefore(phase, "FINALISTS_READY");
}

/** Tope de categorías de premio en la votación: se usa al activar categorías. */
export function canEditMaxPrize(phase: EventPhase): boolean {
  return isBefore(phase, "VOTING");
}

export function canEditSchedule(phase: EventPhase): boolean {
  return isBefore(phase, "VOTING_CLOSED");
}

export function canEditWinnerPercent(phase: EventPhase): boolean {
  return isBefore(phase, "CEREMONY");
}
