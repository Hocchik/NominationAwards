import type { ReactNode } from "react";
import type { CategoryType } from "@/generated/prisma/enums";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

// Piezas de la papeleta «Día y noche» (CLAUDE.md §9), comunes a Nominar y
// Votar: hoja con doble regla, sello de tipo rotado, casillas en cobre, sello
// de cera, comprobante de noche y sobre kraft.

const TYPE_LABEL: Record<CategoryType, string> = { PRIZE: "Premio", HONORARY: "Honorífica" };
const pad = (n: number) => String(n).padStart(2, "0");

/** Franja superior: «Ronda 1 · Nominar» y el paso actual («03 / 12»). */
export function RoundBar({ label, step }: { label: string; step?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-1">
      <span className="inline-flex items-center gap-2 font-display text-[11px] font-semibold tracking-[0.14em] uppercase">
        <LogoMark className="h-[18px] w-4 text-copper" />
        {label}
      </span>
      {step && <span className="font-display text-xs font-bold">{step}</span>}
    </div>
  );
}

/** Cabecera de la hoja: rótulo y doble regla de tinta (2px + 1px). */
export function DoubleRule({ left, right }: { left: string; right?: string }) {
  return (
    <div className="space-y-[3px]">
      <div className="flex items-baseline justify-between font-display text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        <span>{left}</span>
        {right && <span>{right}</span>}
      </div>
      <div className="h-0.5 bg-ink" />
      <div className="h-px bg-ink" />
    </div>
  );
}

/** Sello de tipo de categoría, rotado como un timbre. */
export function TypeStamp({ type, className }: { type: CategoryType; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block -rotate-[8deg] px-2.5 py-[7px] font-display text-[10px] font-bold tracking-[0.16em] text-ink uppercase chamfer-6",
        type === "PRIZE" ? "bg-copper" : "bg-sage",
        className,
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

/** Rótulo, nombre y consigna de la categoría, con el sello a la derecha. */
export function CategoryHeading({
  type,
  eyebrow,
  name,
  description,
}: {
  type: CategoryType;
  eyebrow: string;
  name: string;
  description: string;
}) {
  return (
    <div className="relative space-y-1.5 pr-[5.5rem]">
      <p className="inline-flex items-center gap-[7px] font-display text-[10px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
        <span aria-hidden="true" className={cn("size-[7px]", type === "PRIZE" ? "bg-copper" : "bg-sage")} />
        {eyebrow}
        {/* El sello ya dice el tipo a la vista; aquí solo para lectores de pantalla */}
        <span className="sr-only"> · {TYPE_LABEL[type]}</span>
      </p>
      <h1 className="font-display text-[25px] leading-[1.08] font-bold sm:text-3xl">{name}</h1>
      <p className="text-[15px] leading-snug text-ink-soft sm:text-base">{description}</p>
      <TypeStamp type={type} className="absolute top-4 -right-0.5" />
    </div>
  );
}

/** Barra de pasos: hechos en tinta, el actual en cobre, los que faltan vacíos. */
export function StepBar({ done, current, label }: { done: boolean[]; current: number; label: string }) {
  return (
    <div className="flex gap-[3px]" role="img" aria-label={label}>
      {done.map((isDone, i) => (
        <span
          key={i}
          className={cn(
            "h-[5px] flex-1",
            i === current ? "bg-copper" : isDone ? "bg-ink" : "border border-line-strong/70",
          )}
        />
      ))}
    </div>
  );
}

/** Casilla cuadrada con chaflán que se llena de cobre al marcarla. */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center chamfer-7",
        checked ? "bg-copper" : "bg-ink p-0.5 [&>span]:bg-raised",
      )}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" className="size-4" fill="none">
          <path d="M3 8.5l3.2 3L13 4.5" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="size-full chamfer-6" />
      )}
    </span>
  );
}

/** Sello de cera: estrella dentada en cobre con la marca en tinta. */
export function WaxSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={className}>
      <path
        d="M15 1.5l2.6 1.9 3.2-.4 1.4 2.9 2.9 1.4-.4 3.2 1.9 2.6-1.9 2.6.4 3.2-2.9 1.4-1.4 2.9-3.2-.4L15 28.5l-2.6-1.9-3.2.4-1.4-2.9-2.9-1.4.4-3.2L3.4 15l1.9-2.6-.4-3.2 2.9-1.4 1.4-2.9 3.2.4z"
        fill="var(--copper)"
      />
      <circle cx="15" cy="15" r="7.5" fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M15 10.5l1.5 1.5-1.5 1.5-1.5-1.5z M13.2 14.2h3.6L19 20h-8z" fill="var(--ink)" fillOpacity="0.7" />
    </svg>
  );
}

/** Nota con sello: recuerda que todo se sella en el dispositivo. */
export function SealNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <WaxSeal className="size-6 shrink-0" />
      <p className="text-[13px] leading-snug text-ink-soft">{children}</p>
    </div>
  );
}

/** Índice de la papeleta en PC: categorías con su estado; permite saltar. */
export function BallotIndex({
  items,
  current,
  onPick,
  title,
}: {
  items: { id: string; name: string; type: CategoryType; status: string; done: boolean }[];
  current: number;
  onPick: (index: number) => void;
  title: string;
}) {
  return (
    <nav aria-label={title} className="space-y-3 max-lg:hidden">
      <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">{title}</p>
      <ol className="border-t-2 border-ink">
        {items.map((item, i) => {
          const on = i === current;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={on ? "step" : undefined}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 border-b border-line px-3 text-left text-sm transition-colors",
                  on ? "bg-ink text-sheet" : "hover:bg-ink/5",
                )}
              >
                <span className={cn("w-6 font-display text-xs font-bold", on ? "text-copper" : "text-ink-soft")}>
                  {pad(i + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className={cn("block truncate text-xs", on ? "text-sheet/75" : "text-ink-soft")}>{item.status}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0", item.done ? (item.type === "PRIZE" ? "bg-copper" : "bg-sage") : "border border-line-strong")}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Comprobante: un pedacito de noche, levemente torcido como un ticket. */
export function ReceiptCard({ code, note }: { code: string; note: string }) {
  return (
    <div className="theme-night flex -rotate-[1.5deg] flex-col items-center gap-1.5 bg-bg px-7 py-3.5 chamfer-12">
      <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Tu comprobante</span>
      <span className="font-display text-[30px] leading-none font-bold tracking-[0.12em] text-ink">{code}</span>
      <span className="text-[11px] font-bold tracking-[0.1em] text-copper uppercase">{note}</span>
    </div>
  );
}

/** Pantalla final tras sellar: sobre, explicación, comprobante y acciones. */
export function SealedScreen({
  title,
  text,
  code,
  receiptNote,
  help,
  actions,
}: {
  title: string;
  text: string;
  code: string;
  receiptNote: string;
  help: string;
  actions: ReactNode;
}) {
  return (
    <section className="relative mx-auto flex max-w-md flex-col items-center gap-4 pt-4 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-6 -z-10 h-[30rem] bg-raised/50 [clip-path:polygon(40%_0,60%_0,92%_100%,8%_100%)]"
      />
      <div className="mt-4">
        <Envelope />
      </div>
      <div className="mt-2 space-y-2">
        <h1 className="font-display text-[28px] leading-tight font-extrabold">{title}</h1>
        <p className="mx-auto max-w-[19rem] text-[15px] leading-relaxed text-ink-soft">{text}</p>
      </div>
      <ReceiptCard code={code} note={receiptNote} />
      <p className="max-w-[20rem] text-[13px] leading-relaxed text-ink-soft">{help}</p>
      <div className="mt-2 flex w-full gap-2.5">{actions}</div>
    </section>
  );
}

/** Sobre kraft cerrado con sello de cera (pantalla «Voto sellado»). */
export function Envelope() {
  return (
    <div aria-hidden="true" className="relative h-[170px] w-[250px] drop-shadow-[0_14px_18px_rgb(20_26_25/0.18)]">
      <div className="absolute inset-0 bg-kraft" />
      <div className="absolute inset-x-0 top-0 h-[100px] bg-[color-mix(in_oklab,var(--kraft)_85%,var(--ink))] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[110px] bg-[color-mix(in_oklab,var(--kraft)_80%,white)] [clip-path:polygon(0_100%,50%_18%,100%_100%)]" />
      <WaxSeal className="absolute top-[68px] left-[93px] size-16" />
    </div>
  );
}
