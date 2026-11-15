import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { nominationBallotBytes } from "@/lib/ballots/nomination";
import { getCategories, getCurrentEvent } from "@/lib/event/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { SalaNotice } from "../SalaNotice";
import { NominationBallot } from "./NominationBallot";

export const metadata: Metadata = { title: "Nominar", robots: { index: false, follow: false } };

export default function NominatePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <Suspense
        fallback={
          <Card className="h-72 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando tu papeleta…</span>
          </Card>
        }
      >
        <Nominate />
      </Suspense>
    </main>
  );
}


async function Nominate() {
  const event = await getCurrentEvent();
  if (!event) return <SalaNotice title="La sala todavía no abre" text="Vuelve cuando el organizador la abra." back={false} />;

  const participant = await getSessionParticipant(event.id);
  if (!participant) redirect("/entrar?ir=nominar");

  if (event.phase !== "NOMINATIONS") {
    return <SalaNotice title="Las nominaciones no están abiertas" text="Revisa la sala para ver en qué etapa va la premiación." />;
  }
  if (participant.hasNominated) {
    return <SalaNotice title="Ya enviaste tus nominaciones" text="Solo se puede una vez. Los nominados se conocerán cuando cierren las nominaciones." />;
  }
  if (!event.nominationPublicKey) {
    return <SalaNotice title="Todavía no se puede nominar" text="Falta que el notario configure sus llaves. Avísale al organizador." />;
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
    return <SalaNotice title="Todavía no hay categorías" text="El organizador aún no las agrega." />;
  }

  return (
    <NominationBallot
      roomCode={event.roomCode}
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
