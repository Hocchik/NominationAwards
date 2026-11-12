"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";

// «Cartelera» (CLAUDE.md §9): índice de categorías y una categoría a la vez
// «en escenario». En móvil, chips arriba y deslizar para cambiar. Nunca hay
// conteos: los finalistas llegan en orden alfabético (regla 8).

export interface BoardFinalist {
  id: string;
  name: string;
  photoUrl: string | null;
  blurb: string | null;
  /** Referente de fuera del grupo (no es participante). */
  external: boolean;
}

export interface BoardCategory {
  id: string;
  /** Número en la cartelera: "01", "02"… */
  num: string;
  name: string;
  description: string;
  type: "PRIZE" | "HONORARY";
  /** Vacío mientras los nominados no se revelan. */
  finalists: BoardFinalist[];
}

type Filter = "ALL" | "PRIZE" | "HONORARY";

const TYPE_LABEL = { PRIZE: "Premio", HONORARY: "Honorífica" } as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function NomineesBoard({
  revealed,
  categories,
  slots,
  revealNote,
}: {
  revealed: boolean;
  categories: BoardCategory[];
  /** Cartas boca abajo por categoría mientras no se revelan. */
  slots: number;
  /** Texto bajo cada carta boca abajo. */
  revealNote: string;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState(categories[0]?.id);

  const visible = filter === "ALL" ? categories : categories.filter((c) => c.type === filter);
  const index = Math.max(0, visible.findIndex((c) => c.id === selectedId));
  const current = visible[index];

  const go = (step: number) => {
    if (visible.length === 0) return;
    setSelectedId(visible[(index + step + visible.length) % visible.length]!.id);
  };

  // En móvil, el chip elegido siempre queda a la vista (no al cargar: movería la página).
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!current) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chipRefs.current
      .get(current.id)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: smooth ? "smooth" : "auto" });
  }, [current]);

  // Deslizar a los lados cambia de categoría (solo si el gesto es horizontal).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - start.y) * 1.5) go(dx < 0 ? 1 : -1);
  };

  if (!current) {
    return (
      <Card>
        <p className="text-ink-soft">Todavía no hay categorías.</p>
      </Card>
    );
  }

  const counts = {
    ALL: categories.length,
    PRIZE: categories.filter((c) => c.type === "PRIZE").length,
    HONORARY: categories.filter((c) => c.type === "HONORARY").length,
  };
  const filters = (
    <Filters
      value={filter}
      counts={counts}
      onChange={(next) => {
        setFilter(next);
        // Al filtrar, la categoría en escenario pasa a ser la primera visible si la actual ya no está.
        const list = next === "ALL" ? categories : categories.filter((c) => c.type === next);
        if (!list.some((c) => c.id === selectedId)) setSelectedId(list[0]?.id);
      }}
    />
  );
  const prev = visible[(index - 1 + visible.length) % visible.length]!;
  const next = visible[(index + 1) % visible.length]!;
  const prize = current.type === "PRIZE";

  return (
    // minmax(0,1fr): sin esto la columna crece al ancho de la fila de chips y aparece scroll horizontal.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-9">
      {/* Índice (PC) */}
      <aside className="hidden flex-col gap-3.5 lg:flex">
        {filters}
        <ol className="border-t-2 border-ink">
          {visible.map((c) => {
            const on = c.id === current.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 border-b border-line px-3.5 text-left text-[15px] transition-colors",
                    on ? "bg-ink font-bold text-sheet" : "font-medium text-ink hover:bg-ink/5",
                  )}
                >
                  <span className={cn("w-6 font-display text-xs font-bold", on ? "text-copper" : "text-ink-soft")}>
                    {c.num}
                  </span>
                  <span className="flex-1">{c.name}</span>
                  <TypeMark type={c.type} />
                </button>
              </li>
            );
          })}
        </ol>
        {counts.PRIZE > 0 && counts.HONORARY > 0 && (
          <div className="flex gap-4 text-[13px] text-ink-soft" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 bg-copper" /> Premio
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 bg-sage" /> Honorífica
            </span>
          </div>
        )}
      </aside>

      {/* Filtros y chips (móvil) */}
      <div className="space-y-3 lg:hidden">
        {filters}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {visible.map((c) => {
            const on = c.id === current.id;
            return (
              <button
                key={c.id}
                type="button"
                ref={(el) => {
                  if (el) chipRefs.current.set(c.id, el);
                  else chipRefs.current.delete(c.id);
                }}
                onClick={() => setSelectedId(c.id)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-[13px] font-bold transition-colors",
                  on ? "bg-ink text-sheet" : "border border-line-strong text-ink",
                )}
              >
                <TypeMark type={c.type} />
                {c.num} {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Escenario */}
      <Card
        as="article"
        accent={prize ? "prize" : "honor"}
        aria-labelledby="stage-title"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="space-y-4 overflow-hidden px-3.5 pt-4 pb-3.5 lg:space-y-6 lg:chamfer-24 lg:px-10 lg:pt-8 lg:pb-7 lg:before:chamfer-23"
      >
        {/* Haz de luz sobre el escenario */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-[5] bg-raised/80 [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)] lg:[clip-path:polygon(36%_0,64%_0,94%_100%,6%_100%)]"
        />

        <header className="flex items-end gap-3 lg:gap-5">
          <span aria-hidden="true" className="font-display text-[56px] leading-[0.8] font-extrabold tracking-[-0.03em] lg:text-[108px]">
            {current.num}
          </span>
          <div className="min-w-0 space-y-1.5 lg:space-y-2 lg:pb-0.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Chip size="sm" tone={prize ? "copper" : "sage"}>
                {TYPE_LABEL[current.type]}
              </Chip>
              <span className="text-[13px] text-ink-soft max-lg:sr-only">
                Categoría {current.num} de {pad(categories.length)}
              </span>
            </div>
            <h2 id="stage-title" className="font-display text-xl leading-[1.1] font-bold lg:text-[40px] lg:leading-[1.05]">
              {current.name}
            </h2>
            <p className="text-lg leading-snug text-ink-soft max-lg:hidden">{current.description}</p>
          </div>
        </header>
        <p className="text-sm leading-snug text-ink-soft lg:hidden">{current.description}</p>

        <ul className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-6 lg:px-1.5">
          {revealed
            ? current.finalists.map((f, i) => <Nominee key={f.id} finalist={f} number={i + 1} />)
            : Array.from({ length: slots }, (_, i) => <FaceDown key={i} number={i + 1} note={revealNote} />)}
        </ul>
        {revealed && current.finalists.length === 0 && (
          <p className="text-sm text-ink-soft">Esta categoría no tiene nominados.</p>
        )}

        {visible.length > 1 && (
          <nav aria-label="Cambiar de categoría" className="flex items-center justify-between gap-2 lg:gap-4 lg:border-t lg:border-line lg:pt-4">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={`Categoría anterior: ${prev.name}`}
              className="flex min-h-12 min-w-12 items-center justify-center gap-2 border-[1.5px] border-ink px-3 text-sm font-bold transition-colors hover:bg-ink/5 lg:px-4"
            >
              ← <span className="max-lg:hidden">{prev.num} {prev.name}</span>
            </button>
            <span className="flex-1 text-center text-xs text-ink-soft lg:hidden">
              {current.num} de {pad(visible.length)} · desliza para cambiar
            </span>
            <span className="flex gap-1 max-lg:hidden" aria-hidden="true">
              {visible.map((c) => (
                <span key={c.id} className={cn("h-1 w-3.5", c.id === current.id ? "bg-copper" : "bg-line-strong/60")} />
              ))}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={`Categoría siguiente: ${next.name}`}
              className="flex min-h-12 min-w-12 items-center justify-center gap-2 border-[1.5px] border-ink px-3 text-sm font-bold transition-colors hover:bg-ink/5 lg:px-4"
            >
              <span className="max-lg:hidden">{next.num} {next.name}</span> →
            </button>
          </nav>
        )}
      </Card>
    </div>
  );
}

function Filters({
  value,
  counts,
  onChange,
}: {
  value: Filter;
  counts: Record<Filter, number>;
  onChange: (next: Filter) => void;
}) {
  // Si todas las categorías son del mismo tipo, filtrar no tiene sentido.
  if (counts.PRIZE === 0 || counts.HONORARY === 0) return null;
  const options: { key: Filter; label: string }[] = [
    { key: "ALL", label: `Todas · ${counts.ALL}` },
    { key: "PRIZE", label: "Premio" },
    { key: "HONORARY", label: "Honoríficas" },
  ];
  return (
    <div role="group" aria-label="Filtrar categorías" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "min-h-11 px-3 text-[13px] transition-colors",
            value === o.key ? "bg-ink font-bold text-sheet" : "border border-line-strong font-semibold text-ink hover:bg-ink/5",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TypeMark({ type }: { type: BoardCategory["type"] }) {
  return (
    <span
      role="img"
      aria-label={TYPE_LABEL[type]}
      className={cn("size-2 shrink-0", type === "PRIZE" ? "bg-copper" : "bg-sage")}
    />
  );
}

/** Marco fino con la esquina superior izquierda cortada (fotos y cartas). */
function Frame({ night, children }: { night?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("p-px chamfer-tl-12 lg:chamfer-tl-16", night ? "bg-ink" : "bg-(--accent)")}>
      <div className="relative aspect-[4/3] overflow-hidden chamfer-tl-11 sm:aspect-[7/8] lg:chamfer-tl-15">{children}</div>
    </div>
  );
}

function NumberTag({ number }: { number: number }) {
  return (
    <span className="absolute top-2 left-2 z-10 bg-(--accent) px-1.5 py-0.5 font-display text-[9px] font-bold tracking-[0.1em] text-ink lg:top-2.5 lg:left-3 lg:text-[10px]">
      Nº {pad(number)}
    </span>
  );
}

function Nominee({ finalist, number }: { finalist: BoardFinalist; number: number }) {
  return (
    <li className="flex flex-col">
      <Frame>
        {finalist.photoUrl ? (
          <div className="photo-duotone size-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL */}
            <img src={finalist.photoUrl} alt={`Foto de ${finalist.name}`} className="size-full object-cover" />
          </div>
        ) : (
          <span aria-hidden="true" className="grid size-full place-items-center bg-sand font-display text-[38px] font-extrabold text-ink lg:text-[64px]">
            {initials(finalist.name)}
          </span>
        )}
        {/* Destello diagonal */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-raised/15 [clip-path:polygon(55%_0,78%_0,45%_100%,22%_100%)] max-lg:hidden"
        />
        <NumberTag number={number} />
        {finalist.external && (
          <span className="absolute right-2 bottom-2 bg-ink px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-sheet uppercase lg:right-2.5 lg:bottom-2.5">
            Fuera del grupo
          </span>
        )}
      </Frame>
      {/* Línea de escenario */}
      <div className="h-0.5 bg-ink lg:h-[3px]" aria-hidden="true" />
      <span className="pt-2 font-display text-xs leading-tight font-bold lg:pt-3.5 lg:text-[17px]">{finalist.name}</span>
      {finalist.blurb && (
        <span className="mt-0.5 text-[11px] leading-snug text-ink-soft italic lg:mt-1 lg:text-sm">
          <span className="max-lg:hidden">«</span>
          {finalist.blurb}
          <span className="max-lg:hidden">»</span>
        </span>
      )}
    </li>
  );
}

function FaceDown({ number, note }: { number: number; note: string }) {
  return (
    <li className="flex flex-col">
      <Frame night>
        <div className="theme-night card-facedown flex size-full flex-col items-center justify-center gap-3.5" aria-hidden="true">
          <span className="grid size-12 rotate-45 place-items-center border-[1.5px] border-(--accent) bg-bg lg:size-[74px]">
            <LogoMark className="h-[22px] w-5 -rotate-45 text-(--accent) lg:h-[34px] lg:w-[30px]" />
          </span>
          <span className="bg-bg px-2 py-0.5 font-display text-[11px] font-bold tracking-[0.16em] text-ink uppercase max-lg:hidden">
            Nº {pad(number)}
          </span>
        </div>
      </Frame>
      <div className="h-0.5 bg-ink lg:h-[3px]" aria-hidden="true" />
      <span className="pt-2 font-display text-xs leading-tight font-bold lg:pt-3.5 lg:text-[17px]">Nominado Nº {pad(number)}</span>
      <span className="mt-0.5 text-[11px] leading-snug text-ink-soft italic lg:mt-1 lg:text-sm">{note}</span>
    </li>
  );
}
