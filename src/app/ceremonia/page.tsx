import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { CeremonyShow } from "./CeremonyShow";

export const metadata: Metadata = { title: "Ceremonia", robots: { index: false, follow: false } };

export default function CeremonyPage() {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Cargando la ceremonia…</p>}>
      <Ceremony />
    </Suspense>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <Card className="space-y-3">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <div className="text-sm text-muted">{children}</div>
      </Card>
    </main>
  );
}

async function Ceremony() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return <Notice title="Ceremonia">Primero crea el evento.</Notice>;

  if (event.phase !== "CEREMONY") {
    return (
      <Notice title="Todavía no es la ceremonia">
        {event.phase === "FINISHED"
          ? "La premiación ya terminó."
          : "Cuando la votación haya cerrado y estén todos reunidos, avanza a «Ceremonia» desde "}
        {event.phase !== "FINISHED" && (
          <Link href="/admin/evento" className="text-gold underline underline-offset-4">
            Evento
          </Link>
        )}
        .
      </Notice>
    );
  }
  if (!event.votePublicKey) return <Notice title="Faltan las llaves del notario">Sin ellas no se pueden abrir los votos.</Notice>;

  // Orden de revelación definido en Finalistas; finalistas en orden alfabético.
  const categories = await prisma.category.findMany({
    where: { eventId: event.id, activeForVote: true },
    orderBy: [{ revealOrder: "asc" }, { sortOrder: "asc" }],
    include: { finalists: { orderBy: { displayName: "asc" } } },
  });

  return (
    <CeremonyShow
      eventName={event.name}
      publicKey={event.votePublicKey}
      showWinnerPercent={event.showWinnerPercent}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        finalists: c.finalists.map((f) => ({ id: f.id, name: f.displayName, photoUrl: f.photoUrl, blurb: f.blurb })),
      }))}
    />
  );
}
