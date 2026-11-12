import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

  // Con sesión, la vista por defecto de la sala es la página de Nominados,
  // que también muestra su participación (CLAUDE.md §7).
  const participant = await getSessionParticipant(event.id);
  if (participant) redirect(`/s/${event.roomCode}/nominados`);

  if (event.phase === "SETUP") {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-ink-soft">
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
        <p className="text-sm text-ink-soft">Te damos la bienvenida a</p>
        <h1 className="font-display text-3xl leading-tight font-extrabold">{event.name}</h1>
        <p className="text-sm text-ink-soft">
          Nominaciones y votación anónimas: nadie, ni el organizador, puede ver lo que elijas.
        </p>
      </div>
      <EntryForms roomCode={event.roomCode} names={names} registration={registration} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        <Link href={`/s/${event.roomCode}/nominados`} className="flex min-h-11 items-center underline underline-offset-4">
          Ver los nominados
        </Link>
        <Link href="/transparencia" className="flex min-h-11 items-center underline underline-offset-4">
          ¿Quién puede ver lo que elijo? Nadie.
        </Link>
      </div>
    </Card>
  );
}
