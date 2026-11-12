import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { EventPhase } from "@/generated/prisma/enums";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Countdown } from "@/components/ui/Countdown";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { boardCountdown, boardState, roomAction } from "@/lib/event/nominees";
import { canRegister } from "@/lib/event/rules";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { ParticipantStrip } from "../ParticipantStrip";
import { type BoardCategory, NomineesBoard } from "./NomineesBoard";

export const metadata: Metadata = { title: "Nominados", robots: { index: false, follow: false } };

type Params = Promise<{ roomCode: string }>;

// La vista más visitada de la sala (CLAUDE.md §7). Es pública para quien tenga
// el link: los nominados no son secretos, los votos sí. Nada de conteos (regla 8).

export default function NomineesPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 space-y-5 px-4 pb-10 sm:px-6 lg:space-y-8 lg:px-10 lg:pb-14">
      <header className="-mx-4 flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-line-strong/50 px-4 sm:-mx-6 sm:px-6">
        <Logo className="py-3" />
        <nav aria-label="Sala" className="flex gap-6 text-[15px] font-semibold max-sm:w-full">
          <span aria-current="page" className="border-b-[3px] border-copper pt-3 pb-2.5 sm:pt-5 sm:pb-4">
            Nominados
          </span>
          <Link href="/transparencia" className="pt-3 pb-3 text-ink-soft hover:text-ink sm:pt-5 sm:pb-[19px]">
            ¿Quién ve mi voto?
          </Link>
        </nav>
      </header>
      <Suspense
        fallback={
          <Card className="h-96 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando los nominados…</span>
          </Card>
        }
      >
        <Nominees params={params} />
      </Suspense>
    </main>
  );
}

const EYEBROW: Record<EventPhase, string> = {
  SETUP: "Muy pronto",
  NOMINATIONS: "Nominaciones abiertas",
  NOMINATIONS_CLOSED: "Nominaciones cerradas",
  FINALISTS_READY: "Pronto la votación final",
  VOTING: "Votación final abierta",
  VOTING_CLOSED: "Votación cerrada",
  CEREMONY: "Hoy es la premiación",
  FINISHED: "La premiación terminó",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function Nominees({ params }: { params: Params }) {
  const { roomCode } = await params;
  const event = await getEventByRoomCode(roomCode);
  if (!event) notFound();

  const [participant, categories] = await Promise.all([
    getSessionParticipant(event.id),
    prisma.category.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { finalists: { orderBy: { displayName: "asc" } } },
    }),
  ]);
  const active = categories.filter((c) => c.activeForVote);
  const state = boardState(event.phase, active.length);

  if (state === "closed") {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-ink-soft">La sala todavía no abre. Vuelve cuando empiecen las nominaciones.</p>
      </Card>
    );
  }

  const revealed = state === "revealed";
  // Boca abajo no se manda ningún finalista al navegador; reveladas, solo las activas.
  const shown = revealed ? active : categories;
  const board: BoardCategory[] = shown.map((c, i) => ({
    id: c.id,
    num: String(i + 1).padStart(2, "0"),
    name: c.name,
    description: c.description,
    type: c.type,
    finalists: revealed
      ? c.finalists.map((f) => ({
          id: f.id,
          name: f.displayName,
          photoUrl: f.photoUrl,
          blurb: f.blurb,
          external: f.participantId === null,
        }))
      : [],
  }));
  const totalFinalists = board.reduce((sum, c) => sum + c.finalists.length, 0);

  const subline = revealed
    ? `${plural(totalFinalists, "nominado", "nominados")} en ${plural(board.length, "categoría", "categorías")}, elegidos por el grupo. En orden alfabético y sin conteos.`
    : event.phase === "NOMINATIONS"
      ? `${plural(board.length, "categoría", "categorías")}. Los nominados se revelan cuando cierren las nominaciones.`
      : "Las nominaciones cerraron. Los nominados se anuncian pronto.";

  const countdown = boardCountdown(event);
  const action = roomAction(event.phase, participant);
  const cta =
    action === "nominate"
      ? { href: `/s/${event.roomCode}/nominar`, label: "Nominar →" }
      : action === "vote"
        ? { href: `/s/${event.roomCode}/votar`, label: "Ir a votar →" }
        : action === "enter"
          ? { href: `/s/${event.roomCode}`, label: canRegister(event.phase) ? "Registrarme o entrar →" : "Entrar →" }
          : null;

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-1 lg:pt-4">
        <div className="max-w-[36rem] flex-[1_1_28rem] space-y-2.5 lg:space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase lg:text-[13px]">
            <span className="size-2 bg-copper" aria-hidden="true" />
            {EYEBROW[event.phase]}
          </p>
          <h1 className="font-display text-[34px] leading-[0.95] font-extrabold uppercase sm:text-5xl lg:text-[64px]">
            {revealed ? "Los nominados" : "Nominados en camino"}
          </h1>
          <p className="text-ink-soft lg:text-[17px] lg:leading-normal">{subline}</p>
        </div>
        {(countdown || cta) && (
          <div className="flex flex-wrap items-end gap-4">
            {countdown && <Countdown title={countdown.title} target={countdown.target.toISOString()} />}
            {cta && (
              <Link href={cta.href} className={buttonClasses({ size: "lg", className: "max-sm:w-full" })}>
                {cta.label}
              </Link>
            )}
          </div>
        )}
      </section>

      {participant && <ParticipantStrip participant={participant} phase={event.phase} />}

      <NomineesBoard
        revealed={revealed}
        categories={board}
        slots={event.finalistsPerCategory}
        revealNote={event.phase === "NOMINATIONS" ? "Se revela al cerrar las nominaciones" : "Se revela pronto"}
      />
    </>
  );
}
