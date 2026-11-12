import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { canRegister } from "@/lib/event/rules";
import {
  countActiveRegistrations,
  getEventByRoomCode,
  listLoginNames,
} from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { EntryForms } from "./EntryForms";
import { ParticipantHome } from "./ParticipantHome";

export const metadata: Metadata = {
  title: "Sala",
  robots: { index: false, follow: false },
};

type Params = Promise<{ roomCode: string }>;

export default function RoomPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-4 py-10">
      <Logo />
      <Suspense
        fallback={
          <Card className="h-64 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando la sala…</span>
          </Card>
        }
      >
        <Room params={params} />
      </Suspense>
    </main>
  );
}

async function Room({ params }: { params: Params }) {
  const { roomCode } = await params;
  const event = await getEventByRoomCode(roomCode);
  if (!event) notFound();

  const participant = await getSessionParticipant(event.id);
  if (participant) {
    return (
      <ParticipantHome
        participant={participant}
        phase={event.phase}
        roomCode={event.roomCode}
        votingOpensAt={event.votingOpensAt?.toISOString() ?? null}
        votingClosesAt={event.votingClosesAt?.toISOString() ?? null}
      />
    );
  }

  if (event.phase === "SETUP") {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted">
          La sala todavía no abre. Cuando empiecen las nominaciones podrás registrarte aquí mismo.
        </p>
      </Card>
    );
  }

  const [names, active] = await Promise.all([
    listLoginNames(event.id),
    countActiveRegistrations(event.id),
  ]);
  const registration = !canRegister(event.phase)
    ? "El registro ya cerró. Si te registraste antes, entra con «Ya me registré»."
    : active >= event.capacity
      ? "La sala está llena. Habla con el organizador."
      : null;

  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted">Te damos la bienvenida a</p>
        <h1 className="font-display text-3xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted">
          Nominaciones y votación anónimas: nadie, ni el organizador, puede ver lo que elijas.
        </p>
      </div>
      <EntryForms roomCode={event.roomCode} names={names} registration={registration} />
      <p className="text-xs text-muted">
        <Link href="/transparencia" className="underline underline-offset-4">
          ¿Quién puede ver lo que elijo? Nadie.
        </Link>
      </p>
    </Card>
  );
}
