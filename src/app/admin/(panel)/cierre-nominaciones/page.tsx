import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCategories, getCurrentEvent } from "@/lib/event/queries";
import { PanelLoading } from "../../_components/PanelLoading";
import { ClosingFlow } from "./ClosingFlow";

export const metadata: Metadata = { title: "Cierre de nominaciones" };

export default function ClosingPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <ClosingPanel />
    </Suspense>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-2">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <div className="text-sm text-ink-soft">{children}</div>
    </Card>
  );
}

async function ClosingPanel() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return <Notice title="Cierre de nominaciones">Primero crea el evento.</Notice>;

  if (event.phase === "SETUP" || event.phase === "NOMINATIONS") {
    return (
      <Notice title="Las nominaciones siguen abiertas">
        Ciérralas desde{" "}
        <Link href="/admin/evento" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
          Evento
        </Link>{" "}
        (avanzar a «Nominaciones cerradas») y vuelve aquí con el notario.
      </Notice>
    );
  }
  if (event.phase !== "NOMINATIONS_CLOSED") {
    return (
      <Notice title="Los finalistas ya están guardados">
        Revísalos en{" "}
        <Link href="/admin/finalistas" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
          Finalistas
        </Link>
        .
      </Notice>
    );
  }
  if (!event.nominationPublicKey) {
    return <Notice title="Faltan las llaves del notario">Sin ellas no hay papeletas que abrir.</Notice>;
  }

  const [categories, participants, ballotCount] = await Promise.all([
    getCategories(event.id),
    prisma.participant.findMany({ where: { eventId: event.id }, select: { id: true, displayName: true } }),
    prisma.ballot.count({ where: { eventId: event.id, phase: "NOMINATION" } }),
  ]);

  return (
    <ClosingFlow
      publicKey={event.nominationPublicKey}
      ballotCount={ballotCount}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        framing: c.framing,
        nomineeKind: c.nomineeKind,
        maxPicks: c.maxPicks,
        allowExternal: c.allowExternal,
        finalistCount: c.finalistCount,
        directOptions: c.nomineeKind === "DIRECT" ? c.options.map((o) => ({ id: o.id, label: o.label })) : [],
      }))}
      participantNames={Object.fromEntries(participants.map((p) => [p.id, p.displayName]))}
      optionLabels={Object.fromEntries(categories.flatMap((c) => c.options.map((o) => [o.id, o.label])))}
    />
  );
}
