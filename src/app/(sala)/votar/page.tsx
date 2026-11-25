import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loader } from "@/components/ui/Loader";
import { prisma } from "@/lib/db";
import { voteBallotBytes } from "@/lib/ballots/vote";
import { categoryTitle } from "@/lib/event/categoryKinds";
import { finalistDisplay } from "@/lib/event/finalistDisplay";
import { finalistGuests } from "@/lib/event/nicknames";
import { getCurrentEvent, sortByType } from "@/lib/event/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { SalaNotice } from "../SalaNotice";
import { VoteBallotForm } from "./VoteBallotForm";

export const metadata: Metadata = { title: "Votar", robots: { index: false, follow: false } };

export default function VotePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <Suspense
        fallback={<Loader label="Preparando tu papeleta…" />}
      >
        <Vote />
      </Suspense>
    </main>
  );
}


async function Vote() {
  // Siempre en el momento: depende de la fase, la hora y quién entró (sin prerender).
  await connection();
  const event = await getCurrentEvent();
  if (!event) return <SalaNotice title="La sala todavía no abre" text="Vuelve cuando el organizador la abra." back={false} />;

  const participant = await getSessionParticipant(event.id);
  if (!participant) redirect("/entrar?ir=votar");

  if (event.phase !== "VOTING") {
    return <SalaNotice title="La votación no está abierta" text="Revisa la sala para ver cuándo abre o si ya cerró." />;
  }
  if (participant.hasVoted) {
    return <SalaNotice title="Ya votaste" text="Solo se puede una vez. Los ganadores se revelan en la ceremonia. ¿No fuiste tú? Alguien entró con tu nombre: escríbele al organizador para que bote ese voto sin abrirlo y puedas votar de nuevo." />;
  }
  if (!event.votePublicKey) {
    return <SalaNotice title="Todavía no se puede votar" text="Falta la llave de votación del notario. Avísale al organizador." />;
  }

  // Categorías en el orden de la sala (premios y luego honoríficas); finalistas
  // en orden alfabético (nada insinúa conteos).
  const categories = sortByType(
    await prisma.category.findMany({
      where: { eventId: event.id, activeForVote: true },
      orderBy: { sortOrder: "asc" },
      include: { finalists: { orderBy: { displayName: "asc" } } },
    }),
  );
  if (categories.length === 0) {
    return <SalaNotice title="No hay categorías en la votación" text="El organizador aún no las activa." />;
  }
  const guests = await finalistGuests(event.id, categories);

  return (
    <VoteBallotForm
      roomCode={event.roomCode}
      eventName={event.name}
      categories={categories.map((c) => ({
        id: c.id,
        name: categoryTitle(c),
        description: c.description,
        type: c.type,
        // Solo se marca su propia tarjeta (para que no pueda votarse); el
        // servidor no necesita ver el voto para eso.
        finalists: c.finalists.map((f) => {
          const shown = finalistDisplay(f, guests, c.nomineeKind);
          return {
            id: f.id,
            name: f.displayName,
            photoUrl: shown.photoUrl,
            partnerPhotoUrl: shown.partnerPhotoUrl,
            kind: shown.kind,
            blurb: f.blurb,
            isSelf: f.participantId === participant.id || f.partnerParticipantId === participant.id,
          };
        }),
      }))}
      publicKey={event.votePublicKey}
      ballotBytes={voteBallotBytes(categories.length)}
      closesAt={event.votingClosesAt?.toISOString() ?? null}
    />
  );
}
