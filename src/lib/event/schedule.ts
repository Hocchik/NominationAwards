import type { EventPhase } from "@/generated/prisma/enums";

// Cierre de nominaciones y apertura/cierre de la votación por horario
// (CLAUDE.md §3). No hay un proceso en segundo plano: cada vez que alguien abre
// la sala o el panel se revisa la hora y, si toca, el evento avanza de fase.

export interface ScheduleInput {
  phase: EventPhase;
  now: Date;
  nominationsCloseAt: Date | null;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  /** Hay categorías activas y llave de votación: sin eso no se abre sola. */
  readyToOpen: boolean;
}

/** La fase que corresponde por horario, o null si no hay que cambiar nada. */
export function scheduledPhase(input: ScheduleInput): EventPhase | null {
  let phase = input.phase;
  // Cerrar nominaciones solo deja de recibir papeletas; abrirlas sigue siendo
  // tarea del notario, así que de aquí no se avanza más sin él.
  if (phase === "NOMINATIONS" && input.nominationsCloseAt && input.now >= input.nominationsCloseAt) {
    phase = "NOMINATIONS_CLOSED";
  }
  if (phase === "FINALISTS_READY" && input.readyToOpen && input.votingOpensAt && input.now >= input.votingOpensAt) {
    phase = "VOTING";
  }
  if (phase === "VOTING" && input.votingClosesAt && input.now >= input.votingClosesAt) {
    phase = "VOTING_CLOSED";
  }
  return phase === input.phase ? null : phase;
}
