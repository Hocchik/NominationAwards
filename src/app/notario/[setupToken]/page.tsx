import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { getEventForSetupToken } from "@/lib/notary";
import { NotarySetup } from "./NotarySetup";

export const metadata: Metadata = {
  title: "Notario",
  // El token va en la URL: que no se filtre a otros sitios ni a buscadores.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function NotaryPage({ params }: { params: Promise<{ setupToken: string }> }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-10">
      <Logo />
      <Suspense
        fallback={
          <Card className="h-48 animate-pulse" aria-busy="true">
            <span className="sr-only">Cargando…</span>
          </Card>
        }
      >
        <NotaryContent params={params} />
      </Suspense>
    </main>
  );
}

async function NotaryContent({ params }: { params: Promise<{ setupToken: string }> }) {
  const { setupToken } = await params;
  const event = await getEventForSetupToken(setupToken);

  if (!event) {
    // No se distingue "no existe" de "ya se usó": no se revela nada del evento.
    return (
      <Card className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Este link no está disponible</h1>
        <p className="text-sm text-muted">
          Ya se usó, fue reemplazado por otro o no es válido. Si te toca custodiar las llaves y
          aún no las generaste, pide al organizador un link nuevo.
        </p>
      </Card>
    );
  }

  return <NotarySetup token={setupToken} eventId={event.id} eventName={event.name} />;
}
