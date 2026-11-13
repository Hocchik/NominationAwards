import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/db";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import { getCategories } from "@/lib/event/queries";
import { getEventByRoomCode } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { NominationBallot } from "./NominationBallot";

export const metadata: Metadata = { title: "Nominar", robots: { index: false, follow: false } };

type Params = Promise<{ roomCode: string }>;

export default function NominatePage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <Suspense
        fallback={
          <Card className="h-72 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando tu papeleta…</span>
          </Card>
        }
      >
        <Nominate params={params} />
      </Suspense>
    </main>
  );
}

function Notice({ roomCode, title, text }: { roomCode: string; title: string; text: string }) {
  return (
    <Card className="mt-4 space-y-3">
      <Logo />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-sm text-ink-soft">{text}</p>
      <Link href={`/s/${roomCode}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
        Volver a la sala
      </Link>
    </Card>
  );
}

async function Nominate({ params }: { params: Params }) {
  const { roomCode } = await params;
  const event = await getEventByRoomCode(roomCode);
  if (!event) notFound();

  const participant = await getSessionParticipant(event.id);
  if (!participant) redirect(`/s/${event.roomCode}`);

  const code = event.roomCode;
  if (event.phase !== "NOMINATIONS") {
    return <Notice roomCode={code} title="Las nominaciones no están abiertas" text="Revisa la sala para ver en qué etapa va la premiación." />;
  }
  if (participant.hasNominated) {
    return <Notice roomCode={code} title="Ya enviaste tus nominaciones" text="Solo se puede una vez. Los nominados se conocerán cuando cierren las nominaciones." />;
  }
  if (!event.nominationPublicKey) {
    return <Notice roomCode={code} title="Todavía no se puede nominar" text="Falta que el notario configure sus llaves. Avísale al organizador." />;
  }

  // Todo el grupo de la lista de invitados (haya entrado o no), menos uno mismo.
  const [categories, approved] = await Promise.all([
    getCategories(event.id),
    prisma.participant.findMany({
      where: { eventId: event.id, id: { not: participant.id } }, // no autonominarse
      select: { id: true, displayName: true },
      orderBy: { normalizedName: "asc" },
    }),
  ]);
  if (categories.length === 0) {
    return <Notice roomCode={code} title="Todavía no hay categorías" text="El organizador aún no las agrega." />;
  }

  return (
    <NominationBallot
      roomCode={code}
      eventName={event.name}
      categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description, type: c.type }))}
      candidates={approved.map((p) => ({ id: p.id, name: p.displayName }))}
      rules={{ min: event.minNominations, max: event.maxNominations, allowSkip: event.allowNominationSkip }}
      publicKey={event.nominationPublicKey}
      ballotBytes={nominationBallotBytes(categories.length, event.maxNominations)}
      selfName={participant.displayName}
    />
  );
}
