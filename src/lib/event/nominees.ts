import type { EventPhase } from "@/generated/prisma/enums";
import { isBefore } from "./phases";

// Página de Nominados («Cartelera», CLAUDE.md §7 y §9). Aquí solo se decide
// QUÉ se muestra; nada de esto conoce conteos (regla 8).

/**
 * - closed: la sala aún no abre.
 * - waiting: las categorías con cartas boca abajo.
 * - revealed: los finalistas de las categorías activas.
 *
 * Activar una categoría en Finalistas es lo que la publica: así el admin puede
 * cargar fotos y frases antes de que el grupo las vea, y una categoría que no
 * pasa a la votación nunca aparece como «nominada».
 */
export type BoardState = "closed" | "waiting" | "revealed";

export function boardState(phase: EventPhase, activeCategories: number): BoardState {
  if (phase === "SETUP") return "closed";
  if (isBefore(phase, "FINALISTS_READY")) return "waiting";
  return activeCategories > 0 ? "revealed" : "waiting";
}

export interface BoardCountdown {
  title: string;
  target: Date;
}

/** La próxima hora programada que le importa al grupo, según la fase. */
export function boardCountdown(event: {
  phase: EventPhase;
  nominationsCloseAt: Date | null;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
}): BoardCountdown | null {
  switch (event.phase) {
    case "NOMINATIONS":
      return event.nominationsCloseAt && { title: "Las nominaciones cierran en", target: event.nominationsCloseAt };
    case "FINALISTS_READY":
      return event.votingOpensAt && { title: "La votación abre en", target: event.votingOpensAt };
    case "VOTING":
      return event.votingClosesAt && { title: "La votación cierra en", target: event.votingClosesAt };
    default:
      return null;
  }
}

export type RoomAction = "nominate" | "vote" | "enter" | null;

/** El botón principal de la sala para quien está mirando. */
export function roomAction(
  phase: EventPhase,
  participant: { hasNominated: boolean; hasVoted: boolean } | null,
): RoomAction {
  if (phase === "SETUP" || !isBefore(phase, "VOTING_CLOSED")) return null;
  if (!participant) return "enter";
  if (phase === "NOMINATIONS" && !participant.hasNominated) return "nominate";
  if (phase === "VOTING" && !participant.hasVoted) return "vote";
  return null;
}
