import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Suspense } from "react";
import { Loader } from "@/components/ui/Loader";
import { Countdown } from "@/components/ui/Countdown";
import { getCurrentEvent } from "@/lib/event/queries";
import { homeView } from "@/lib/event/nominees";
import { listGuests } from "@/lib/participants/queries";
import { getSessionParticipant } from "@/lib/participants/session";
import { EntryCard } from "./EntryCard";
import { NomineesView } from "./NomineesView";
import { ParticipantStrip } from "./ParticipantStrip";
import { SalaNotice } from "./SalaNotice";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// La sala es la raíz del sitio (CLAUDE.md §3 y §7): un solo link para todo el
// evento. Mientras las nominaciones están abiertas, aquí solo se nomina; desde
// que cierran, la página es la de Nominados con el botón Votar. La ceremonia
// nunca aparece: la abre el organizador desde su panel. No hay ningún link
// visible al panel (la puerta escondida es el logo).

export default function HomePage() {
  return (
    <Suspense
      fallback={<Loader label="Cargando la sala…" />}
    >
      <Home />
    </Suspense>
  );
}

async function Home() {
  const event = await getCurrentEvent();
  const view = event ? homeView(event.phase) : "closed";
  if (!event || view === "closed") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <SalaNotice title="La sala todavía no abre" text="Vuelve cuando el organizador avise que empiezan las nominaciones." back={false}>
          {/* Mientras tanto: probar cómo será, sin evento, y ver el sistema de diseño */}
          <p className="text-sm text-ink-soft">Mientras tanto, puedes ver cómo funciona con un grupo de ejemplo:</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/demo" className={buttonClasses({ className: "max-sm:w-full" })}>
              Probar la demo
            </Link>
            <a href="/diseno.html" className={buttonClasses({ variant: "secondary", className: "max-sm:w-full" })}>
              Ver el diseño
            </a>
          </div>
        </SalaNotice>
      </main>
    );
  }

  const participant = await getSessionParticipant(event.id);
  if (view === "nominees") return <NomineesView event={event} participant={participant} />;

  // Nominaciones abiertas: tocar tu nombre → nominar → listo.
  if (!participant) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
        <EntryCard
          eventName={event.name}
          guests={await listGuests(event.id)}
          next="/nominar"
          lead="Las nominaciones están abiertas: toca tu nombre para nominar."
        />
      </main>
    );
  }
  if (!participant.hasNominated) redirect("/nominar");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-10">
      <SalaNotice
        title="¡Listo! Ya enviaste tus nominaciones"
        text="Quedaron selladas en secreto. Cuando cierren las nominaciones, aquí mismo verás a los nominados y luego podrás votar."
        back={false}
      >
        {event.nominationsCloseAt && <Countdown title="Las nominaciones cierran en" target={event.nominationsCloseAt.toISOString()} />}
      </SalaNotice>
      <ParticipantStrip participant={participant} phase={event.phase} />
    </main>
  );
}
