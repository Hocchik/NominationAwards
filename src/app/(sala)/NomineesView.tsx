import Link from "next/link";
import type { Event, Participant } from "@/generated/prisma/client";
import type { EventPhase } from "@/generated/prisma/enums";
import { type BoardCategory, type ClosingLine, NomineesShow, type VoteCta } from "@/components/nominees/NomineesShow";
import { AdminDoor } from "@/components/room/AdminDoor";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { groupPhotoSlots } from "@/lib/event/groupPhotos";
import { finalistNicknames } from "@/lib/event/nicknames";
import { boardCountdown, boardState, voteButton } from "@/lib/event/nominees";
import { ParticipantStrip } from "./ParticipantStrip";

// Nominados: la página principal (/) desde que cierran las nominaciones
// (CLAUDE.md §3 y §7). Es pública para quien tenga el link: los nominados no son
// secretos, los votos sí. Nada de conteos (regla 8). El botón Votar se ve desde
// el principio y se activa a la hora programada. La ceremonia nunca sale aquí.

export function NomineesView({ event, participant }: { event: Event; participant: Participant | null }) {
  // Siempre de noche (decisión del usuario, 2026-11-14): es la antesala de la gala.
  return (
    <main className="theme-night palette-claro flex w-full flex-1 flex-col bg-bg text-ink">
      <header className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-line-strong/50 px-4 sm:px-6 lg:px-16">
        <AdminDoor>
          <Logo className="py-3" />
        </AdminDoor>
        <nav aria-label="Sala" className="flex gap-6 text-[15px] font-semibold max-sm:w-full">
          <span aria-current="page" className="border-b-[3px] border-copper pt-3 pb-2.5 sm:pt-5 sm:pb-4">
            Nominados
          </span>
          <Link href="/transparencia" className="pt-3 pb-3 text-ink-soft hover:text-ink sm:pt-5 sm:pb-[19px]">
            ¿Quién ve mi voto?
          </Link>
        </nav>
      </header>
      <Nominees event={event} participant={participant} />
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

async function Nominees({ event, participant }: { event: Event; participant: Participant | null }) {
  const [categories, savedPhotos] = await Promise.all([
    prisma.category.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { finalists: { orderBy: { displayName: "asc" } } },
    }),
    prisma.groupPhoto.findMany({ where: { eventId: event.id }, select: { slot: true, photoUrl: true, caption: true } }),
  ]);
  const active = categories.filter((c) => c.activeForVote);
  const state = boardState(event.phase, active.length);

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
    : "Las nominaciones cerraron. Los nominados se anuncian pronto.";

  const countdown = boardCountdown(event);
  const vote = voteCta(voteButton(event.phase, participant), countdown !== null);
  return (
    <NomineesShow
      eyebrow={EYEBROW[event.phase]}
      subline={subline}
      revealed={revealed}
      categories={board}
      slots={event.finalistsPerCategory}
      revealNote="Se revela pronto"
      groupPhotos={groupPhotoSlots(savedPhotos)}
      countdown={countdown && { title: countdown.title, target: countdown.target.toISOString() }}
      vote={vote}
      closing={closingLine(event.phase, revealed, totalFinalists, board.length)}
      strip={participant && <ParticipantStrip participant={participant} phase={event.phase} />}
    />
  );
}

/** La frase de la última diapositiva de la entrada. */
function closingLine(phase: EventPhase, revealed: boolean, finalists: number, categories: number): ClosingLine {
  const count = plural(categories, "categoría", "categorías");
  if (!revealed) return { lead: `${count}.`, em: "Los nominados", tail: "se revelan pronto." };
  const lead = `${plural(finalists, "nominado", "nominados")} en ${count}.`;
  return phase === "FINALISTS_READY" || phase === "VOTING"
    ? { lead, em: "Ahora te toca", tail: "elegir al ganador." }
    : { lead, em: "El grupo", tail: "ya eligió." };
}

/** El botón Votar según su estado: con link solo cuando se puede votar. */
function voteCta(button: ReturnType<typeof voteButton>, hasCountdown: boolean): VoteCta | null {
  switch (button?.state) {
    case "soon":
      // Con horario, la cuenta regresiva de al lado dice cuándo abre.
      return { label: hasCountdown ? "Votar" : "La votación abre pronto", href: null };
    case "open":
      return { label: "Votar →", href: button.needsEntry ? "/entrar?ir=votar" : "/votar" };
    case "done":
      return { label: "✔ Ya votaste", href: null };
    case "closed":
      return { label: "Votación cerrada", href: null };
    default:
      return null;
  }
}
