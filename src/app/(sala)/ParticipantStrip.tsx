import type { EventPhase } from "@/generated/prisma/enums";
import type { Participant } from "@/generated/prisma/client";
import { Card } from "@/components/ui/Card";
import { logoutParticipantAction } from "./actions";

/** Qué le toca hacer a un participante según la fase del evento. */
function nextStep(phase: EventPhase, participant: Participant): string {
  switch (phase) {
    case "NOMINATIONS":
      return participant.hasNominated
        ? "Ya enviaste tus nominaciones. Los nominados se conocerán cuando cierren."
        : "Las nominaciones están abiertas: elige a quién nominar en cada categoría.";
    case "NOMINATIONS_CLOSED":
      return "Las nominaciones cerraron. Pronto se anuncian los nominados.";
    case "FINALISTS_READY":
      return "Ya hay nominados. Pronto abre la votación final.";
    case "VOTING":
      return participant.hasVoted
        ? "Ya votaste. Nos vemos en la ceremonia."
        : "La votación final está abierta: elige un ganador por categoría.";
    case "VOTING_CLOSED":
    case "CEREMONY":
      return "La votación cerró. Los ganadores se revelan en la ceremonia.";
    case "FINISHED":
      return "La premiación terminó. ¡Gracias por participar!";
    default:
      return "La sala abre pronto.";
  }
}

/** Franja de «tu participación» en la sala: estado, ✔/⏳ y salir. */
export function ParticipantStrip({ participant, phase }: { participant: Participant; phase: EventPhase }) {
  const status = nextStep(phase, participant);
  // Si alguien entró con su nombre y envió por él, lo arregla el organizador
  // reseteando ese envío (solo mientras la urna sigue abierta).
  const sentNow = (phase === "NOMINATIONS" && participant.hasNominated) || (phase === "VOTING" && participant.hasVoted);

  return (
    <Card size="sm" className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-3.5">
      <div className="space-y-1 text-sm">
        <p>
          <strong className="font-semibold">Hola, {participant.displayName}.</strong> {status}
        </p>
        <p className="text-ink-soft">
          {participant.hasNominated ? "✔ Nominaste" : "⏳ Aún no nominas"} ·{" "}
          {participant.hasVoted ? "✔ Votaste" : "⏳ Aún no votas"}
        </p>
        {sentNow && (
          <p className="text-ink-soft">
            ¿No fuiste tú? Escríbele al organizador: bota ese envío sin abrirlo y vuelves a hacerlo.
          </p>
        )}
      </div>
      <form action={logoutParticipantAction} className="shrink-0">
        <button type="submit" className="min-h-11 text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          No soy {participant.displayName} · Salir
        </button>
      </form>
    </Card>
  );
}
