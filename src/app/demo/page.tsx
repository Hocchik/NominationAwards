import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_VOTERS } from "@/lib/demo/fixtures";

export const metadata: Metadata = { title: "Demo" };

const STEPS = [
  { title: "Entrar", text: "Toca tu nombre en la lista de invitados. Sin contraseñas ni PIN." },
  { title: "Nominar", text: "Llena la papeleta. Se sella en tu navegador, igual que en el evento real." },
  { title: "Nominados", text: "Mira la cartelera con los finalistas de ejemplo, sin conteos." },
  { title: "Votar", text: "Elige un ganador por categoría. Si eres finalista, tu tarjeta sale como «Eres tú»." },
  { title: "Ceremonia", text: `Abre la urna y mira la revelación con tu voto y los de ${DEMO_VOTERS} amigos ficticios.` },
  { title: "Panel", text: "Mira cómo ve el organizador quién ya votó, y cómo resetea un voto hecho con el nombre de otro." },
];

export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <section className="space-y-4">
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-copper" />
          Pruébalo sin evento
        </p>
        <h1 className="font-display text-4xl leading-[0.95] font-extrabold text-balance uppercase sm:text-6xl">
          Así funciona la premiación
        </h1>
        <p className="max-w-xl text-lg text-pretty text-ink-soft">
          Recorre todo con un grupo inventado. La papeleta, el cifrado y el conteo son los de verdad; el
          grupo y sus votos son simulados. Nada sale de tu navegador.
        </p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card size="sm" className="h-full space-y-1.5">
              <p className="font-display text-sm font-bold">
                <span className="text-ink-soft">{String(i + 1).padStart(2, "0")}</span> {step.title}
              </p>
              <p className="text-sm text-ink-soft">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>

      <p className="border-l-[3px] border-copper bg-raised px-4 py-3 text-sm text-ink-soft">
        <strong className="text-ink">Lo que el demo se salta:</strong> el organizador cargando la lista de invitados y el
        notario que abre las nominaciones. En el evento real, los finalistas salen de lo que nominó el grupo.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href="/demo/entrar" className={buttonClasses({ size: "lg", className: "max-sm:w-full" })}>
          Empezar →
        </Link>
        <Link href="/transparencia" className={buttonClasses({ variant: "secondary", size: "lg", className: "max-sm:w-full" })}>
          ¿Quién puede ver mi voto?
        </Link>
      </div>
    </main>
  );
}
