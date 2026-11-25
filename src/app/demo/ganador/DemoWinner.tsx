"use client";

import { useCallback, useEffect, useState } from "react";
import { type RevealPhase, RevealScene } from "@/components/ceremony/Reveal";
import type { StageCategory } from "@/components/ceremony/Stage";
import { Button } from "@/components/ui/Button";
import { DEMO_CATEGORIES, DEMO_EXAMPLE_PLACES, DEMO_EXAMPLE_WINNERS, byName, demoFinalistDisplay } from "@/lib/demo/fixtures";

const categories: StageCategory[] = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  framing: c.framing,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, ...demoFinalistDisplay(f, c.nomineeKind) })),
}));

/** Segundos con los nominados en pantalla antes de que empiece el suspenso (en la gala lo decide el presentador). */
const NOMINEES_SECONDS = 4;

/**
 * La revelación de cada categoría, como se proyecta en la reunión: la misma
 * escena de la ceremonia real, con ganadores de ejemplo. Aquí avanza sola.
 */
export function DemoWinner() {
  const [index, setIndex] = useState(0);
  const [take, setTake] = useState(0); // sube con «Ver de nuevo» para reiniciar la escena
  const [phase, setPhase] = useState<RevealPhase>("nominees");
  // El año de la copa se lee en el navegador, nunca en el prerender.
  const [year, setYear] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la hora se lee una vez al montar
    setYear(String(new Date().getFullYear()));
  }, []);
  const category = categories[index]!;

  // Cada escena empieza con los nominados y pasa sola al suspenso.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia la escena al cambiar de categoría
    setPhase("nominees");
    const timer = setTimeout(() => setPhase("reveal"), NOMINEES_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [index, take]);

  const go = useCallback((step: number) => {
    setIndex((i) => Math.min(Math.max(i + step, 0), categories.length - 1));
  }, []);

  // Flechas del teclado para pasar de categoría.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-copper" />
          Ejemplo de la ceremonia
        </p>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Así se anuncia el ganador</h1>
        <p className="max-w-2xl text-ink-soft">
          Esto no aparece en el celular de quien vota: en la reunión, el organizador abre la ceremonia a la hora que fije y la
          proyecta. Cada categoría muestra a sus nominados, un momento de suspenso y al ganador con los puestos que le siguen,
          sin conteos. Los ganadores de este ejemplo son inventados; en el evento real salen de los votos del grupo.
          <span className="sm:hidden"> Gira el celular para verlo más grande.</span>
        </p>
      </div>

      <div className="theme-night palette-claro overflow-hidden chamfer-12 sm:chamfer-24">
        <RevealScene
          key={`${category.id}-${take}`}
          category={category}
          number={index + 1}
          total={categories.length}
          phase={phase}
          winnerIds={DEMO_EXAMPLE_WINNERS[category.id] ?? []}
          places={DEMO_EXAMPLE_PLACES[category.id]}
          winnerPercent={null}
          showWinnerPercent={false}
          year={year}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}>
          ← Anterior
        </Button>
        <p className="flex-1 text-center text-sm text-ink-soft" aria-live="polite">
          {category.name} · {index + 1} de {categories.length}
        </p>
        <Button variant="secondary" onClick={() => setTake((t) => t + 1)}>
          ↻ Ver de nuevo
        </Button>
        <Button onClick={() => go(1)} disabled={index === categories.length - 1}>
          Siguiente →
        </Button>
      </div>
    </div>
  );
}
