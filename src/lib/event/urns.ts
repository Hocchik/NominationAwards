import type { BallotPhase, EventPhase } from "@/generated/prisma/enums";
import { isBefore } from "./phases";

// Las dos urnas del evento (CLAUDE.md §4, regla 2). Mientras una está abierta,
// cada sobre lleva por fuera el nombre de quien lo envió: así el admin puede
// botar el de una persona si votó otra en su nombre. En cuanto la urna cierra,
// los nombres se arrancan y ya nadie puede unir un sobre con una persona.

/** La urna que recibe sobres en esta fase (y en la que se puede resetear uno), o null. */
export function openUrn(phase: EventPhase): BallotPhase | null {
  if (phase === "NOMINATIONS") return "NOMINATION";
  if (phase === "VOTING") return "VOTE";
  return null;
}

/** Urnas ya cerradas en esta fase: sus sobres no pueden llevar nombre. */
export function closedUrns(phase: EventPhase): BallotPhase[] {
  const urns: BallotPhase[] = [];
  if (!isBefore(phase, "NOMINATIONS_CLOSED")) urns.push("NOMINATION");
  if (!isBefore(phase, "VOTING_CLOSED")) urns.push("VOTE");
  return urns;
}
