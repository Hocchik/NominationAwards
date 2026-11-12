import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { VoteBallotForm } from "./VoteBallotForm";

export const metadata: Metadata = { title: "Votar", robots: { index: false, follow: false } };

type Params = Promise<{ roomCode: string }>;

export default function VotePage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8">
      <Logo />
      <Suspense
        fallback={
          <Card className="h-72 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando tu papeleta…</span>
          </Card>
        }
      >
        <Vote params={params} />
      </Suspense>
    </main>
  );
}

function Notice({ roomCode, title, text }: { roomCode: string; title: string; text: string }) {
  return (
    <Card className="space-y-3">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted">{text}</p>
      <Link href={`/s/${roomCode}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4">
        Volver a la sala
      </Link>
    </Card>
  );
}

async function Vote({ params }: { params: Params }) {
  const { roomCode } = await params;
  const event = await getEventByRoomCode(roomCode);
  if (!event) notFound();

  const participant = await getSessionParticipant(event.id);
  if (!participant) redirect(`/s/${event.roomCode}`);

  const code = event.roomCode;
  if (participant.status !== "APPROVED") {
    return <Notice roomCode={code} title="Aún no puedes votar" text="Tu registro todavía no está aprobado por el organizador." />;
  }
  if (event.phase !== "VOTING") {
    return <Notice roomCode={code} title="La votación no está abierta" text="Revisa la sala para ver cuándo abre o si ya cerró." />;
  }
  if (participant.hasVoted) {
    return <Notice roomCode={code} title="Ya votaste" text="Solo se puede una vez. Los ganadores se revelan en la ceremonia." />;
  }
  if (!event.votePublicKey) {
    return <Notice roomCode={code} title="Todavía no se puede votar" text="Falta la llave de votación del notario. Avísale al organizador." />;
  }

  // Categorías en el orden de siempre; finalistas en orden alfabético (nada insinúa conteos).
  const categories = await prisma.category.findMany({
    where: { eventId: event.id, activeForVote: true },
    orderBy: { sortOrder: "asc" },
    include: { finalists: { orderBy: { displayName: "asc" } } },
  });
  if (categories.length === 0) {
    return <Notice roomCode={code} title="No hay categorías en la votación" text="El organizador aún no las activa." />;
  }

  return (
    <VoteBallotForm
      roomCode={code}
      eventName={event.name}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        finalists: c.finalists.map((f) => ({ id: f.id, name: f.displayName, photoUrl: f.photoUrl, blurb: f.blurb })),
      }))}
      allowAbstention={event.allowVoteAbstention}
      publicKey={event.votePublicKey}
      ballotBytes={voteBallotBytes(categories.length)}
      closesAt={event.votingClosesAt?.toISOString() ?? null}
    />
  );
}
