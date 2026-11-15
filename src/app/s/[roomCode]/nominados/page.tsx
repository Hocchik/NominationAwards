import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { EventPhase } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { groupPhotoSlots } from "@/lib/event/groupPhotos";
import { finalistNicknames } from "@/lib/event/nicknames";
import { boardCountdown, boardState, roomAction } from "@/lib/event/nominees";
import { canRegister } from "@/lib/event/rules";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { ParticipantStrip } from "../ParticipantStrip";
import { type BoardCategory, type ClosingLine, NomineesShow } from "./NomineesShow";

export const metadata: Metadata = { title: "Nominados", robots: { index: false, follow: false } };

type Params = Promise<{ roomCode: string }>;

// La vista más visitada de la sala (CLAUDE.md §7). Es pública para quien tenga
// el link: los nominados no son secretos, los votos sí. Nada de conteos (regla 8).

export default function NomineesPage({ params }: { params: Params }) {
  // Siempre de noche (decisión del usuario, 2026-11-14): es la cartelera de la gala.
  return (
    <main className="theme-night flex w-full flex-1 flex-col bg-bg text-ink">
      <header className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-line-strong/50 px-4 sm:px-6 lg:px-16">
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
          <div className="grid flex-1 place-items-center p-10" aria-busy="true">
            <span className="text-ink-soft">Cargando los nominados…</span>
          </div>
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

  const [participant, categories, savedPhotos] = await Promise.all([
    getSessionParticipant(event.id),
    prisma.category.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { finalists: { orderBy: { displayName: "asc" } } },
    }),
    prisma.groupPhoto.findMany({ where: { eventId: event.id }, select: { slot: true, photoUrl: true, caption: true } }),
  ]);
  const active = categories.filter((c) => c.activeForVote);
  const state = boardState(event.phase, active.length);

  if (state === "closed") {
    return (
      <div className="mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-6 lg:px-16">
        <Card className="space-y-2">
          <h1 className="font-display text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-ink-soft">La sala todavía no abre. Vuelve cuando empiecen las nominaciones.</p>
        </Card>
      </div>
    );
  }

  const revealed = state === "revealed";
  // Boca abajo no se manda ningún finalista al navegador; reveladas, solo las activas.
  const shown = revealed ? active : categories;
  const nicknames = revealed ? await finalistNicknames(event.id, shown) : new Map<string, string>();
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
          nickname: (f.participantId && nicknames.get(f.participantId)) || null,
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
    <NomineesShow
      eyebrow={EYEBROW[event.phase]}
      subline={subline}
      revealed={revealed}
      categories={board}
      slots={event.finalistsPerCategory}
      revealNote={event.phase === "NOMINATIONS" ? "Se revela al cerrar las nominaciones" : "Se revela pronto"}
      groupPhotos={groupPhotoSlots(savedPhotos)}
      countdown={countdown && { title: countdown.title, target: countdown.target.toISOString() }}
      cta={cta}
      closing={closingLine(event.phase, revealed, totalFinalists, board.length)}
      strip={participant && <ParticipantStrip participant={participant} phase={event.phase} />}
    />
  );
}

/** La frase de la última diapositiva de la entrada. */
function closingLine(phase: EventPhase, revealed: boolean, finalists: number, categories: number): ClosingLine {
  const count = plural(categories, "categoría", "categorías");
  if (!revealed) {
    return phase === "NOMINATIONS"
      ? { lead: `${count}.`, em: "Ahora te toca", tail: "nominar." }
      : { lead: `${count}.`, em: "Los nominados", tail: "se revelan pronto." };
  }
  const lead = `${plural(finalists, "nominado", "nominados")} en ${count}.`;
  return phase === "FINALISTS_READY" || phase === "VOTING"
    ? { lead, em: "Ahora te toca", tail: "elegir al ganador." }
    : { lead, em: "El grupo", tail: "ya eligió." };
}
