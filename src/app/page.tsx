import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

// Portada. Cada evento se juega en su sala (/s/[código]), que el organizador
// comparte por WhatsApp; aquí solo se explica cómo entrar.

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <Link href="/admin" className="flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:underline">
          Soy el organizador
        </Link>
      </header>

      <section className="space-y-5 pt-6 sm:pt-12">
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-copper" />
          Nominaciones y votación anónimas
        </p>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold text-balance uppercase sm:text-7xl">
          La noche de los premios
        </h1>
        <p className="max-w-xl text-lg text-pretty text-ink-soft">
          Nomina, vota y descubre a los ganadores en la reunión. Nadie, ni el organizador, puede ver lo que
          elegiste.
        </p>
      </section>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">¿Cómo entro?</h2>
        <p className="text-ink-soft">
          Abre el link de tu sala que compartió el organizador (se ve así: <span className="font-semibold text-ink">…/s/ABC123</span>).
          Ahí te registras con tu nombre y un PIN.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/demo" className={buttonClasses({ className: "max-sm:w-full" })}>
            Pruébalo: demo
          </Link>
          <Link href="/transparencia" className={buttonClasses({ variant: "secondary", className: "max-sm:w-full" })}>
            ¿Quién puede ver mi voto?
          </Link>
        </div>
      </Card>
    </main>
  );
}
