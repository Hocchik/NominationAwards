import type { EventPhase } from "@/generated/prisma/enums";

// Máquina de estados del evento (CLAUDE.md §3). Solo se avanza hacia adelante:
// volver atrás podría reabrir una votación ya cerrada o cambiar las reglas a
// mitad de camino.

export const PHASES = [
  "SETUP",
  "NOMINATIONS",
  "NOMINATIONS_CLOSED",
  "FINALISTS_READY",
  "VOTING",
  "VOTING_CLOSED",
  "CEREMONY",
  "FINISHED",
] as const satisfies readonly EventPhase[];

export const PHASE_LABELS: Record<EventPhase, string> = {
  SETUP: "Preparación",
  NOMINATIONS: "Nominaciones abiertas",
  NOMINATIONS_CLOSED: "Nominaciones cerradas",
  FINALISTS_READY: "Finalistas listos",
  VOTING: "Votación abierta",
  VOTING_CLOSED: "Votación cerrada",
  CEREMONY: "Ceremonia",
  FINISHED: "Terminado",
};

export const PHASE_HINTS: Record<EventPhase, string> = {
  SETUP: "Creas las categorías y el notario genera sus llaves.",
  NOMINATIONS: "El grupo se registra y nomina desde el link de la sala.",
  NOMINATIONS_CLOSED: "El notario abre las nominaciones y se calculan los finalistas.",
  FINALISTS_READY: "Eliges qué categorías pasan a la votación y su orden.",
  VOTING: "Cada participante vota una vez por categoría.",
  VOTING_CLOSED: "Solo se ve la participación; nadie sabe quién va ganando.",
  CEREMONY: "El notario carga su llave y se revelan los ganadores.",
  FINISHED: "Se guardan solo los ganadores para el recuerdo.",
};

export function phaseIndex(phase: EventPhase): number {
  return PHASES.indexOf(phase);
}

export function nextPhase(phase: EventPhase): EventPhase | null {
  return PHASES[phaseIndex(phase) + 1] ?? null;
}

/** true si `phase` todavía no llegó a `limit` (es anterior). */
export function isBefore(phase: EventPhase, limit: EventPhase): boolean {
  return phaseIndex(phase) < phaseIndex(limit);
}

/**
 * Cómo se sale de cada fase:
 * - "button": el admin avanza con el botón (con confirmación).
 * - "flow": se avanza desde otra pantalla, al terminar un proceso (el cierre de
 *   nominaciones guarda los finalistas y pasa a FINALISTS_READY por sí mismo).
 * - "end": no hay fase siguiente.
 */
export const ADVANCE_MODE: Record<EventPhase, "button" | "flow" | "end"> = {
  SETUP: "button",
  NOMINATIONS: "button",
  NOMINATIONS_CLOSED: "flow",
  FINALISTS_READY: "button",
  VOTING: "button",
  VOTING_CLOSED: "button",
  CEREMONY: "button",
  FINISHED: "end",
};

/** Lo que hace falta saber del evento para decidir si se puede avanzar. */
export interface PhaseContext {
  phase: EventPhase;
  /** Total de categorías creadas. */
  categoryCount: number;
  /** Categorías de premio / honoríficas marcadas para la votación. */
  activePrizeCount: number;
  activeHonoraryCount: number;
  maxPrizeCategories: number;
  /** El notario ya subió sus llaves públicas (Fase 2). */
  hasNominationKey: boolean;
  hasVoteKey: boolean;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
}

/**
 * Qué impide pasar de `ctx.phase` a la siguiente fase, en frases cortas para
 * mostrarle al admin ("Falta crear al menos una categoría"). Lista vacía = se
 * puede avanzar.
 *
 * Solo se llama para fases con ADVANCE_MODE "button"; lo de "flow" y "end" ya
 * está resuelto antes.
 */
export function getAdvanceBlockers(ctx: PhaseContext): string[] {
  // TODO(usuario): decide qué exige cada salto. Algunas preguntas:
  // - SETUP → NOMINATIONS: ¿categorías mínimas? ¿las dos llaves del notario?
  //   (sin llave de nominaciones no se puede cifrar ninguna papeleta).
  // - FINALISTS_READY → VOTING: ¿al menos una categoría activa? ¿respetar
  //   maxPrizeCategories? ¿horario de votación definido y coherente?
  // - VOTING → VOTING_CLOSED y las siguientes: ¿algo que exigir, o libre?
  void ctx;
  return [];
}
