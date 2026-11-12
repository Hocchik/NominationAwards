import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { canManageParticipants } from "@/lib/event/rules";
import { isLocked } from "@/lib/participants/lockout";
import { PanelLoading } from "../../_components/PanelLoading";
import { ParticipantRow, type ParticipantRowData } from "../../_components/ParticipantRow";
import { SectionCard } from "../../_components/SectionCard";

export const metadata: Metadata = { title: "Participantes" };

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <ParticipantsPanel />
    </Suspense>
  );
}

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

  // Orden alfabético: el orden de registro no aporta nada aquí.
  const rows = await prisma.participant.findMany({
    where: { eventId: event.id },
    orderBy: { normalizedName: "asc" },
  });
  await connection();
  const now = new Date();
  const toRow = (p: (typeof rows)[number]): ParticipantRowData => ({
    id: p.id,
    displayName: p.displayName,
    status: p.status,
    hasNominated: p.hasNominated,
    hasVoted: p.hasVoted,
    pinReset: p.pinReset,
    locked: isLocked(p.lockedUntil, now),
  });

  const pending = rows.filter((p) => p.status === "PENDING").map(toRow);
  const approved = rows.filter((p) => p.status === "APPROVED").map(toRow);
  const rejected = rows.filter((p) => p.status === "REJECTED").map(toRow);
  const nominated = approved.filter((p) => p.hasNominated).length;
  const voted = approved.filter((p) => p.hasVoted).length;
  const editable = canManageParticipants(event.phase);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Participantes</h1>
        <p className="text-sm text-ink-soft">
          {plural(approved.length, "aprobado", "aprobados")} ·{" "}
          {plural(pending.length, "pendiente", "pendientes")} · cupo {event.capacity}. Nominaron{" "}
          {nominated} de {approved.length} · votaron {voted} de {approved.length}.
        </p>
        <p className="text-xs text-ink-soft">
          Solo ves si cada persona ya nominó o votó, nunca qué eligió.
        </p>
        {!editable && (
          <p className="text-sm text-ink-soft">La votación cerró: los registros ya no se modifican.</p>
        )}
      </div>

      <SectionCard
        id="pendientes"
        title={`Pendientes (${pending.length})`}
        description="Revisa que no haya duplicados (por ejemplo, «Juan» y «Juancho») antes de aprobar."
      >
        <ParticipantList rows={pending} editable={editable} empty="No hay registros pendientes." />
      </SectionCard>

      <SectionCard id="aprobados" title={`Aprobados (${approved.length})`}>
        <ParticipantList rows={approved} editable={editable} empty="Todavía no apruebas a nadie." />
      </SectionCard>

      {rejected.length > 0 && (
        <SectionCard id="rechazados" title={`Rechazados (${rejected.length})`}>
          <ParticipantList rows={rejected} editable={editable} empty="" />
        </SectionCard>
      )}
    </div>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function ParticipantList({
  rows,
  editable,
  empty,
}: {
  rows: ParticipantRowData[];
  editable: boolean;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul>
      {rows.map((p) => (
        <ParticipantRow key={p.id} p={p} editable={editable} />
      ))}
    </ul>
  );
}
