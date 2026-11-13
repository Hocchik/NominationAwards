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
  SETUP: "Creas las categorías, cargas la lista de invitados y el notario genera sus llaves.",
  NOMINATIONS: "Cada uno entra tocando su nombre en el link de la sala y nomina.",
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
  /** Nombres en la lista de invitados. */
  guestCount: number;
  /** Categorías de premio / honoríficas marcadas para la votación. */
  activePrizeCount: number;
  activeHonoraryCount: number;
  maxPrizeCategories: number;
  /** El notario ya subió sus llaves públicas (Fase 2). */
  hasNominationKey: boolean;
  hasVoteKey: boolean;
  nominationsCloseAt: Date | null;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  /** La hora de la consulta (se pasa desde afuera para poder probarla). */
  now: Date;
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
  const blockers: string[] = [];
  const passed = (date: Date | null) => date !== null && date <= ctx.now;

  switch (ctx.phase) {
    // Abrir la sala: después ya no se pueden crear ni borrar categorías, y sin
    // las llaves del notario nadie podría sellar su papeleta.
    case "SETUP":
      if (ctx.categoryCount === 0) blockers.push("Crea al menos una categoría.");
      if (ctx.guestCount === 0) blockers.push("Agrega la lista de invitados en Participantes: cada uno entra tocando su nombre.");
      if (!ctx.hasNominationKey || !ctx.hasVoteKey) {
        blockers.push("Falta que el notario genere sus llaves: sin ellas no se puede sellar ninguna papeleta.");
      }
      // Si la hora ya pasó, las nominaciones se cerrarían apenas alguien entre.
      if (passed(ctx.nominationsCloseAt)) {
        blockers.push("La hora de cierre de nominaciones ya pasó: cámbiala o bórrala en Horarios.");
      }
      break;

    // Abrir la votación a mano: lo mismo que exige la apertura por horario,
    // más el tope de categorías de premio (pudo bajar después de activarlas).
    case "FINALISTS_READY":
      if (ctx.activePrizeCount + ctx.activeHonoraryCount === 0) {
        blockers.push("Activa al menos una categoría en Finalistas.");
      }
      if (ctx.activePrizeCount > ctx.maxPrizeCategories) {
        const n = ctx.activePrizeCount;
        blockers.push(
          `Hay ${n} ${n === 1 ? "categoría de premio activa" : "categorías de premio activas"} y el máximo es ${ctx.maxPrizeCategories}: quita alguna en Finalistas.`,
        );
      }
      if (!ctx.hasVoteKey) blockers.push("Falta la llave de votación del notario.");
      if (passed(ctx.votingClosesAt)) {
        blockers.push("La hora de cierre de la votación ya pasó: cámbiala en Horarios.");
      }
      break;

    // Cerrar antes de tiempo, pasar a la ceremonia o terminar: decisión del
    // admin, con la confirmación del botón.
    default:
      break;
  }
  return blockers;
}
