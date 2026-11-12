import type { EventPhase } from "@/generated/prisma/enums";

// Apertura y cierre de la votación por horario (CLAUDE.md §3, pasos 5 y 6).
// No hay un proceso en segundo plano: cada vez que alguien abre la sala o el
// panel se revisa la hora y, si toca, el evento avanza de fase.

export interface ScheduleInput {
  phase: EventPhase;
  now: Date;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  /** Hay categorías activas y llave de votación: sin eso no se abre sola. */
  readyToOpen: boolean;
}

/** La fase que corresponde por horario, o null si no hay que cambiar nada. */
export function scheduledPhase(input: ScheduleInput): EventPhase | null {
  let phase = input.phase;
  if (phase === "FINALISTS_READY" && input.readyToOpen && input.votingOpensAt && input.now >= input.votingOpensAt) {
    phase = "VOTING";
  }
  if (phase === "VOTING" && input.votingClosesAt && input.now >= input.votingClosesAt) {
    phase = "VOTING_CLOSED";
  }
  return phase === input.phase ? null : phase;
}
