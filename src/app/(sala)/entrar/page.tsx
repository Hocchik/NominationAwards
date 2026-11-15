import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { getCurrentEvent } from "@/lib/event/queries";
import { listGuests } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { EntryCard } from "../EntryCard";
import { entryTarget } from "../entryTarget";
import { SalaNotice } from "../SalaNotice";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

type SearchParams = Promise<{ ir?: string }>;

// Elegir tu nombre de la lista de invitados (CLAUDE.md §5) y seguir a lo que
// ibas a hacer: nominar o votar.
export default function EnterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
      <Suspense
        fallback={
          <Card className="h-64 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando la sala…</span>
          </Card>
        }
      >
        <Enter searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Enter({ searchParams }: { searchParams: SearchParams }) {
  const next = entryTarget((await searchParams).ir);
  const event = await getCurrentEvent();
  if (!event || event.phase === "SETUP") {
    return <SalaNotice title="La sala todavía no abre" text="Vuelve cuando empiecen las nominaciones." back={false} />;
  }
  if (await getSessionParticipant(event.id)) redirect(next);

  return <EntryCard eventName={event.name} guests={await listGuests(event.id)} next={next} />;
}
