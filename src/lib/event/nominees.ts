import type { EventPhase } from "@/generated/prisma/enums";
import { isBefore } from "./phases";

// Página de Nominados («Estreno con recuerdos», CLAUDE.md §7 y §9). Aquí solo se decide
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

/**
 * Qué muestra la página principal (/) según la fase:
 * - closed: la sala aún no abre (SETUP).
 * - nominate: mientras las nominaciones están abiertas, solo se nomina.
 * - nominees: desde que cierran, la página es la de Nominados (con el botón de
 *   votar). La ceremonia nunca aparece aquí: solo la ve el admin.
 */
export type HomeView = "closed" | "nominate" | "nominees";

export function homeView(phase: EventPhase): HomeView {
  if (phase === "SETUP") return "closed";
  if (phase === "NOMINATIONS") return "nominate";
  return "nominees";
}

/**
 * El botón «Votar» de Nominados:
 * - soon: todavía no abre (se ve, pero no se puede tocar).
 * - open: abierta; `needsEntry` si primero hay que tocar tu nombre.
 * - done: ya votaste.
 * - closed: la votación terminó.
 */
export type VoteButton = { state: "soon" } | { state: "open"; needsEntry: boolean } | { state: "done" } | { state: "closed" };

export function voteButton(phase: EventPhase, participant: { hasVoted: boolean } | null): VoteButton | null {
  if (isBefore(phase, "NOMINATIONS_CLOSED")) return null;
  if (isBefore(phase, "VOTING")) return { state: "soon" };
  if (phase === "VOTING") {
    if (!participant) return { state: "open", needsEntry: true };
    return participant.hasVoted ? { state: "done" } : { state: "open", needsEntry: false };
  }
  return { state: "closed" };
}
