import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { canManageParticipants } from "@/lib/event/rules";
import { openUrn } from "@/lib/event/urns";
import { AddGuestsForm } from "../../_components/AddGuestsForm";
import { PanelLoading } from "../../_components/PanelLoading";
import { ParticipantRow } from "../../_components/ParticipantRow";
import { SectionCard } from "../../_components/SectionCard";

export const metadata: Metadata = { title: "Participantes" };

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <ParticipantsPanel />
    </Suspense>
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

async function ParticipantsPanel() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) {
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Participantes</h1>
        <p className="text-sm text-ink-soft">
          Primero{" "}
          <Link href="/admin/evento" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
            crea el evento
          </Link>
          .
        </p>
      </Card>
    );
  }

  // Orden alfabético: el orden en que se agregaron no aporta nada.
  const guests = await prisma.participant.findMany({
    where: { eventId: event.id },
    select: { id: true, displayName: true, hasNominated: true, hasVoted: true },
    orderBy: { normalizedName: "asc" },
  });
  const nominated = guests.filter((p) => p.hasNominated).length;
  const voted = guests.filter((p) => p.hasVoted).length;
  const editable = canManageParticipants(event.phase);
  const urn = openUrn(event.phase);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Participantes</h1>
        <p className="text-sm text-ink-soft">
          {plural(guests.length, "invitado", "invitados")} de un cupo de {event.capacity}. Nominaron {nominated} de{" "}
          {guests.length} · votaron {voted} de {guests.length}.
        </p>
        <p className="text-xs text-ink-soft">
          Solo ves quién ya nominó o votó, nunca qué eligió. En la sala todos los nombres se ven iguales.
        </p>
        {!editable && <p className="text-sm text-ink-soft">La votación cerró: la lista ya no se modifica.</p>}
      </div>

      {editable && (
        <SectionCard
          id="agregar"
          title="Agregar invitados"
          description="Cada persona entra tocando su nombre en la sala. Puedes sumar o quitar nombres hasta que cierre la votación."
        >
          <AddGuestsForm />
        </SectionCard>
      )}

      <SectionCard
        id="lista"
        title={`Lista de invitados (${guests.length})`}
        description={
          urn
            ? `Si alguien ${urn === "VOTE" ? "votó" : "nominó"} con el nombre de otra persona, usa «Resetear»: su sobre se bota sin abrirlo y la persona real puede volver a hacerlo. Al cerrar, los sobres pierden el nombre y ya no se puede resetear.`
            : undefined
        }
      >
        {guests.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no hay nadie en la lista.</p>
        ) : (
          <ul>
            {guests.map((p) => (
              <ParticipantRow key={p.id} p={p} openUrn={urn} editable={editable} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
