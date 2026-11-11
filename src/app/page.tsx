import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Logo } from "@/components/ui/Logo";
import { ChipDemo } from "./_showcase/ChipDemo";

// Página provisional (Fase 0): vitrina del design system "Gala" para revisar
// el estilo. Se reemplazará por la portada real en fases posteriores.

const SWATCHES = [
  { token: "--bg", hex: "#0B0E1A", use: "Fondo base", className: "bg-background" },
  { token: "--surface", hex: "blanco 6% + blur", use: "Tarjetas de vidrio", className: "glass" },
  { token: "--gold", hex: "#D4AF37", use: "Acento · PRIZE", className: "bg-gold" },
  { token: "--gold-soft", hex: "#F3E2A9", use: "Brillos, hover", className: "bg-gold-soft" },
  { token: "--honor", hex: "#B8B5FF", use: "Acento · HONORARY", className: "bg-honor" },
  { token: "--text", hex: "#F5F3EE", use: "Texto principal", className: "bg-foreground" },
  { token: "--muted", hex: "#9A9CB0", use: "Texto secundario", className: "bg-muted" },
  { token: "--success", hex: "#4ADE80", use: "Éxito", className: "bg-success" },
  { token: "--danger", hex: "#F87171", use: "Error", className: "bg-danger" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-16 px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <Chip tone="neutral">Fase 0 · Vista previa</Chip>
      </header>

      {/* Portada */}
      <section className="space-y-6 pt-6 text-center sm:pt-12">
        <p className="text-sm font-medium tracking-[0.3em] text-gold uppercase">Edición 2026</p>
        <h1 className="font-display text-5xl leading-[1.05] font-bold text-balance text-gold-gradient sm:text-7xl">
          La noche de los premios
        </h1>
        <p className="mx-auto max-w-md text-lg text-pretty text-muted">
          Nomina, vota y descubre a los ganadores en la reunión. Nadie, ni el organizador, puede ver
          lo que elegiste.
        </p>
        <div className="mx-auto flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button size="lg">Registrarme</Button>
          <Button size="lg" variant="secondary">
            Ya me registré
          </Button>
        </div>
      </section>

      <Section title="Paleta">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map((s) => (
            <li key={s.token} className="glass overflow-hidden rounded-card">
              <div className={`h-16 border-b border-line ${s.className}`} />
              <div className="space-y-0.5 p-3">
                <p className="font-mono text-sm text-foreground">{s.token}</p>
                <p className="text-xs text-muted">{s.hex}</p>
                <p className="text-xs text-muted">{s.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografía">
        <Card className="space-y-4">
          <p className="text-xs tracking-widest text-muted uppercase">Playfair Display · títulos</p>
          <p className="font-display text-4xl font-bold">Mejor anécdota del año</p>
          <p className="font-display text-2xl italic text-gold-soft">“Y el premio es para…”</p>
          <hr className="border-line" />
          <p className="text-xs tracking-widest text-muted uppercase">Inter · texto y botones</p>
          <p className="text-base">
            Elige de 3 a 5 personas por categoría. Puedes nominar a alguien del grupo o escribir un
            referente externo.
          </p>
          <p className="text-sm text-muted">
            Texto secundario: tu papeleta se cifra en tu celular antes de enviarse.
          </p>
        </Card>
      </Section>

      <Section title="Botones">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="danger">Rechazar</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Enviar mis votos</Button>
            <Button disabled>Desactivado</Button>
          </div>
          <Button fullWidth size="lg">
            Ancho completo (móvil)
          </Button>
        </Card>
      </Section>

      <Section title="Tarjetas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card accent="prize" as="article" className="space-y-2">
            <Chip tone="gold" size="sm">
              Premio
            </Chip>
            <h3 className="font-display text-2xl font-semibold text-gold-gradient">
              El alma de la fiesta
            </h3>
            <p className="text-sm text-muted">¿Quién convierte cualquier reunión en un evento?</p>
          </Card>
          <Card accent="honor" as="article" className="space-y-2">
            <Chip tone="honor" size="sm">
              Honorífica
            </Chip>
            <h3 className="font-display text-2xl font-semibold text-honor-gradient">
              Amistad incondicional
            </h3>
            <p className="text-sm text-muted">Siempre está, aunque nadie lo pida.</p>
          </Card>
          <Card as="article" className="space-y-2 sm:col-span-2">
            <h3 className="font-display text-xl font-semibold">Tarjeta neutra</h3>
            <p className="text-sm text-muted">
              Vidrio suave para formularios, resúmenes y pantallas de admin.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Chips">
        <Card className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Chip tone="gold">Dorado</Chip>
            <Chip tone="honor">Lavanda</Chip>
            <Chip tone="neutral">Neutro</Chip>
          </div>
          <hr className="border-line" />
          <p className="text-sm text-muted">Nominados seleccionados (toca la ✕ para quitar):</p>
          <ChipDemo />
        </Card>
      </Section>

      <footer className="pt-4 text-center text-sm text-muted">
        <p className="font-display text-lg text-foreground">¿Quién puede ver mi voto? Nadie.</p>
        <p>Código abierto para que el grupo pueda auditarlo.</p>
      </footer>
    </main>
  );
}
