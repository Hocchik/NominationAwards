import Link from "next/link";
import type { EventPhase } from "@/generated/prisma/enums";
import type { Participant } from "@/generated/prisma/client";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { PHASE_LABELS } from "@/lib/event/phases";
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

const primaryLink =
  "flex min-h-14 w-full items-center justify-center rounded-xl bg-gold px-7 text-lg font-semibold text-background transition-colors hover:bg-gold-soft";

export function ParticipantHome({
  participant,
  phase,
  roomCode,
  votingOpensAt,
  votingClosesAt,
}: {
  participant: Participant;
  phase: EventPhase;
  roomCode: string;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
}) {
  const approved = participant.status === "APPROVED";
  const canNominate = approved && phase === "NOMINATIONS" && !participant.hasNominated;
  const canVote = approved && phase === "VOTING" && !participant.hasVoted;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Hola, {participant.displayName}</h1>
        <Chip size="sm" tone="neutral">
          {PHASE_LABELS[phase]}
        </Chip>
      </div>

      {participant.status === "PENDING" && (
        <p className="text-sm">
          Tu registro está <strong>pendiente</strong>: el organizador lo aprobará pronto. Vuelve a
          esta página en un rato; ya no hace falta que escribas tu PIN en este dispositivo.
        </p>
      )}
      {participant.status === "REJECTED" && (
        <p className="text-sm">
          Tu registro no fue aprobado. Si crees que es un error, habla con el organizador.
        </p>
      )}
      {approved && (
        <div className="space-y-3 text-sm">
          <p>Ya estás dentro. {nextStep(phase, participant)}</p>
          {phase === "FINALISTS_READY" && votingOpensAt && (
            <p>
              La votación abre el <strong><LocalDateTime iso={votingOpensAt} /></strong>.
            </p>
          )}
          {phase === "VOTING" && votingClosesAt && (
            <p>
              Cierra el <strong><LocalDateTime iso={votingClosesAt} /></strong>.
            </p>
          )}
          <ul className="space-y-1 text-muted">
            <li>{participant.hasNominated ? "✔ Nominaste" : "⏳ Aún no nominas"}</li>
            <li>{participant.hasVoted ? "✔ Votaste" : "⏳ Aún no votas"}</li>
          </ul>
          {canNominate && (
            <Link href={`/s/${roomCode}/nominar`} className={primaryLink}>
              Nominar
            </Link>
          )}
          {canVote && (
            <Link href={`/s/${roomCode}/votar`} className={primaryLink}>
              Votar
            </Link>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        <Link href="/transparencia" className="underline underline-offset-4">
          ¿Quién puede ver lo que elijo? Nadie.
        </Link>
      </p>

      <form action={logoutParticipantAction} className="border-t border-line pt-4">
        <button type="submit" className="min-h-11 text-sm text-muted underline underline-offset-4">
          No soy {participant.displayName} · Salir
        </button>
      </form>
    </Card>
  );
}
