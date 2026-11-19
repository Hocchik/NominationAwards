"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Navegación de Nominados con ~20 categorías (lienzo, Ronda 21 · «Hilo»):
// - Hilo: una línea fina pegada arriba con la categoría actual, una raya de
//   avance y «de 20», que abre la lista completa para saltar a cualquiera.
// - PC: además, un riel de rayitas en el borde derecho; el nombre aparece solo
//   al pasar el mouse, así no tapa nada mientras no se usa.
// Los capítulos tienen id `categoria-{num}` (NomineesShow).

export interface NavCategory {
  num: string;
  name: string;
  type: "PRIZE" | "HONORARY";
  /** Iniciales de los nominados (vacío si todavía están boca abajo). */
  initials: string[];
}

type Filter = "ALL" | "PRIZE" | "HONORARY";

const HILO_HEIGHT = 44;

const chapterId = (num: string) => `categoria-${num}`;

export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [top, setTop] = useState(0);
  const [filter, setFilter] = useState<Filter>("ALL");
  const dialog = useRef<HTMLDialogElement>(null);

  // Si hay otra franja pegada arriba (el demo), el hilo va debajo.
  useEffect(() => {
    const other = document.querySelector<HTMLElement>("[data-sticky-top]");
    if (!other) return;
    const measure = () => setTop(other.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(other);
    return () => ro.disconnect();
  }, []);

  // Al saltar a un capítulo, que el título no quede debajo del hilo.
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-top", `${top + HILO_HEIGHT}px`);
    return () => {
      document.documentElement.style.removeProperty("--nav-top");
    };
  }, [top]);

  // Categoría actual: la última cuyo inicio ya pasó la mitad de la pantalla.
  useEffect(() => {
    const sections = categories.map((c) => document.getElementById(chapterId(c.num))).filter((s): s is HTMLElement => s !== null);
    if (sections.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let index = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= line) index = i;
      });
      setCurrent(index);
      const first = sections[0]!.getBoundingClientRect().top + window.scrollY;
      const last = sections[sections.length - 1]!;
      const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
      setProgress(end > first ? Math.min(Math.max((window.scrollY - first) / (end - first), 0), 1) : 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [categories]);

  const jump = useCallback((num: string) => {
    dialog.current?.close();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(chapterId(num))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, []);

  const active = categories[current];
  if (!active) return null;
  const total = String(categories.length).padStart(2, "0");
  const hasHonorary = categories.some((c) => c.type === "HONORARY");
  const hasPrize = categories.some((c) => c.type === "PRIZE");
  const visible = categories.filter((c) => filter === "ALL" || c.type === filter);

  return (
    <>
      {/* Hilo */}
      <div
        className="sticky z-10 bg-bg/85 backdrop-blur-md"
        style={{ top, height: HILO_HEIGHT } as CSSProperties}
      >
        <div className="mx-auto flex h-[42px] max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-16">
          <span className={cn("font-display text-[13px] font-extrabold", active.type === "PRIZE" ? "accent-prize" : "accent-honor", "text-(--accent)")}>
            {active.num}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold" aria-live="polite">
            {active.name}
          </span>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="-mr-2 inline-flex min-h-10 items-center gap-1.5 px-2 text-[13px] text-ink-soft hover:text-ink"
          >
            <span className="lg:hidden">de {total}</span>
            <span className="max-lg:hidden">Ver las {total} categorías</span>
            <Chevron />
          </button>
        </div>
        <div className="h-0.5 bg-ink/10">
          <div className="h-0.5 origin-left bg-copper" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      {/* Riel de rayitas (solo PC) */}
      <nav aria-label="Categorías" className="fixed top-1/2 right-3 z-10 hidden -translate-y-1/2 flex-col lg:flex">
        {categories.map((c, i) => {
          const isCurrent = i === current;
          return (
            <a
              key={c.num}
              href={`#${chapterId(c.num)}`}
              onClick={(e) => {
                e.preventDefault();
                jump(c.num);
              }}
              aria-current={isCurrent ? "true" : undefined}
              className={cn("group relative flex h-3.5 w-9 items-center justify-end outline-none", c.type === "PRIZE" ? "accent-prize" : "accent-honor")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 transition-all duration-200",
                  isCurrent
                    ? "w-6 bg-copper"
                    : cn("w-3 group-hover:w-4 group-focus-visible:w-4", c.type === "HONORARY" ? "bg-(--accent)/80" : "bg-ink/45 group-hover:bg-ink/80"),
                )}
              />
              <span className="pointer-events-none absolute top-1/2 right-10 flex -translate-y-1/2 items-baseline gap-2 border border-line-strong bg-raised px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap opacity-0 chamfer-6 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <b className="font-display text-[11px] text-(--accent)">{c.num}</b>
                {c.name}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Lista completa */}
      <dialog
        ref={dialog}
        aria-label="Categorías"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-0 mt-auto max-h-[85svh] w-full max-w-none bg-sheet p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-h-[80svh] sm:max-w-lg sm:chamfer-14 max-sm:rounded-t-[22px]"
      >
        <div className="flex max-h-[inherit] flex-col">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between px-5 pt-3.5 pb-1.5">
            <p className="font-display text-lg font-extrabold tracking-[-0.02em]">
              Categorías <span className="font-semibold text-ink-soft">· {categories.length}</span>
            </p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar"
              className="grid size-10 place-items-center rounded-full bg-raised text-lg text-ink-soft hover:text-ink"
            >
              ×
            </button>
          </div>
          {hasPrize && hasHonorary && (
            <div className="flex gap-1.5 px-5 pt-1.5 pb-2.5 text-[13px]">
              {(
                [
                  ["ALL", "Todas"],
                  ["PRIZE", `Premio · ${categories.filter((c) => c.type === "PRIZE").length}`],
                  ["HONORARY", `Honoríficas · ${categories.filter((c) => c.type === "HONORARY").length}`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn("min-h-9 rounded-full px-3", filter === value ? "bg-ink font-bold text-bg" : "bg-raised text-ink-soft hover:text-ink")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <ul className="overflow-y-auto overscroll-contain pb-4">
            {visible.map((c) => {
              const isCurrent = c.num === active.num;
              return (
                <li key={c.num} className={c.type === "PRIZE" ? "accent-prize" : "accent-honor"}>
                  <button
                    type="button"
                    onClick={() => jump(c.num)}
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 px-5 text-left hover:bg-raised",
                      isCurrent && "bg-(--accent)/12 shadow-[inset_3px_0_0_var(--accent)]",
                    )}
                  >
                    <span className={cn("w-6 font-display text-[13px] font-extrabold", isCurrent ? "text-(--accent)" : "text-ink-soft")}>{c.num}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[15px]", isCurrent && "font-bold")}>{c.name}</span>
                      {isCurrent && <span className="block text-[11px] font-bold text-(--accent)">Estás aquí</span>}
                    </span>
                    {c.initials.length > 0 && (
                      <span className="flex shrink-0" aria-hidden="true">
                        {c.initials.slice(0, 4).map((ini, k) => (
                          <span
                            key={k}
                            className={cn(
                              "grid size-[22px] place-items-center rounded-full bg-sand font-display text-[7px] font-extrabold tracking-[-0.04em] text-(--accent) outline-2 outline-sheet",
                              k > 0 && "-ml-[7px]",
                            )}
                          >
                            {ini}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
