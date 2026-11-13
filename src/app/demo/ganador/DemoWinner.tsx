"use client";

import { useCallback, useEffect, useState } from "react";
import { CategoryTopBar, NightStage, type StageCategory, WinnerView, pad } from "@/components/ceremony/Stage";
import { Button } from "@/components/ui/Button";
import { celebrate } from "@/lib/ceremony/effects";
import { cn } from "@/lib/cn";
import { DEMO_CATEGORIES, DEMO_EVENT_NAME, DEMO_EXAMPLE_WINNERS, byName } from "@/lib/demo/fixtures";

const categories: StageCategory[] = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({ id: f.id, name: f.name, photoUrl: null, blurb: f.blurb })),
}));

/**
 * Solo la pantalla del ganador, como se proyecta en la reunión: la misma
 * escena de la ceremonia real, con ganadores de ejemplo.
 */
export function DemoWinner() {
  const [index, setIndex] = useState(0);
  // El año del trofeo se lee en el navegador, nunca en el prerender.
  const [year, setYear] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la hora se lee una vez al montar
    setYear(String(new Date().getFullYear()));
  }, []);
  const category = categories[index]!;

  const go = useCallback((step: number) => {
    setIndex((i) => Math.min(Math.max(i + step, 0), categories.length - 1));
  }, []);

  // Confeti en cada ganador, como en la gala (se apaga con «reducir movimiento»).
  useEffect(() => {
    celebrate(category.type === "PRIZE" ? "prize" : "honor");
  }, [category.type, index]);

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
          Así se anuncia en la reunión
        </p>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">El ganador</h1>
        <p className="max-w-2xl text-ink-soft">
          En la premiación, cada categoría termina con esta pantalla en el proyector. Los ganadores de este demo son de
          ejemplo; en el evento real salen de los votos del grupo.
          <span className="sm:hidden"> Gira el celular para verlo más grande.</span>
        </p>
      </div>

      <div
        role="img"
        aria-label={`Categoría ${index + 1}: ${category.name}`}
        className={cn(
          "theme-night @container relative aspect-video w-full overflow-hidden bg-bg chamfer-12 sm:chamfer-24",
          category.type === "HONORARY" ? "accent-honor" : "accent-prize",
        )}
      >
        <NightStage number={pad(index + 1)} />
        <CategoryTopBar eventName={DEMO_EVENT_NAME} categories={categories} index={index} />
        <WinnerView
          key={category.id}
          category={category}
          winnerIds={DEMO_EXAMPLE_WINNERS[category.id] ?? []}
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
        <Button onClick={() => go(1)} disabled={index === categories.length - 1}>
          Siguiente →
        </Button>
      </div>
    </div>
  );
}
