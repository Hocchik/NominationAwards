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

/** Reglas de la papeleta de votación (p. ej., si se permite abstenerse). */
export function canEditVoteRules(phase: EventPhase): boolean {
  return isBefore(phase, "VOTING");
}

/** La hora de cierre de nominaciones: deja de importar en cuanto cierran. */
export function canEditNominationsClose(phase: EventPhase): boolean {
  return isBefore(phase, "NOMINATIONS_CLOSED");
}

export function canEditSchedule(phase: EventPhase): boolean {
  return isBefore(phase, "VOTING_CLOSED");
}

export function canEditWinnerPercent(phase: EventPhase): boolean {
  return isBefore(phase, "CEREMONY");
}

/**
 * Registro abierto (CLAUDE.md §3): desde que abren las nominaciones hasta el
 * cierre de la votación, para quien no alcanzó a nominar.
 */
export function canRegister(phase: EventPhase): boolean {
  return !isBefore(phase, "NOMINATIONS") && isBefore(phase, "VOTING_CLOSED");
}

/** Aprobar, rechazar, restablecer PIN o eliminar registros: hasta que cierra la votación. */
export function canManageParticipants(phase: EventPhase): boolean {
  return isBefore(phase, "VOTING_CLOSED");
}
