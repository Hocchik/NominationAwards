import type { EventPhase } from "@/generated/prisma/enums";
import type { Participant } from "@/generated/prisma/client";
import { Card } from "@/components/ui/Card";
import { logoutParticipantAction } from "./actions";

/** Qué le toca hacer a un participante aprobado según la fase del evento. */
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
  const status =
    participant.status === "PENDING"
      ? "Tu registro está pendiente: el organizador lo aprobará pronto. Ya no hace falta que escribas tu PIN en este dispositivo."
      : participant.status === "REJECTED"
        ? "Tu registro no fue aprobado. Si crees que es un error, habla con el organizador."
        : nextStep(phase, participant);

  return (
    <Card size="sm" className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-3.5">
      <div className="space-y-1 text-sm">
        <p>
          <strong className="font-semibold">Hola, {participant.displayName}.</strong> {status}
        </p>
        {participant.status === "APPROVED" && (
          <p className="text-ink-soft">
            {participant.hasNominated ? "✔ Nominaste" : "⏳ Aún no nominas"} ·{" "}
            {participant.hasVoted ? "✔ Votaste" : "⏳ Aún no votas"}
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
