"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RevealScene } from "@/components/ceremony/Reveal";
import { NightStage, type StageCategory } from "@/components/ceremony/Stage";
import { LogoMark } from "@/components/ui/Logo";
import { type VoteResults, openAndTallyVotes } from "@/lib/ballots/openVotes";
import { cn } from "@/lib/cn";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import { getVoteBallotsAction } from "./actions";

// Pantalla de la ceremonia para el proyector (16:9). Los votos se abren aquí,
// con la llave del notario en memoria (regla 7); solo se muestran ganadores y,
// si el evento lo permite, su % redondeado (regla 8).

type CategoryInfo = StageCategory;

type Slide =
  | { kind: "cover" }
  | { kind: "turnout" }
  // Dos pasos por categoría: los nominados, y (al avanzar) suspenso → ganador.
  | { kind: "category"; index: number; step: "nominees" | "reveal" }
  | { kind: "end" };

export function CeremonyShow({
  eventName,
  publicKey,
  showWinnerPercent,
  categories,
}: {
  eventName: string;
  publicKey: string;
  showWinnerPercent: boolean;
  categories: CategoryInfo[];
}) {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);

  const slides = useMemo<Slide[]>(
    () => [
      { kind: "cover" },
      { kind: "turnout" },
      ...categories.flatMap((_, index) =>
        (["nominees", "reveal"] as const).map((step): Slide => ({ kind: "category", index, step })),
      ),
      { kind: "end" },
    ],
    [categories],
  );
  const slide = slides[Math.min(position, slides.length - 1)];

  // Abre la urna con la llave del notario y se queda solo con los ganadores;
  // la llave y los votos abiertos se descartan al terminar (regla 7).
  function loadKey(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const parsed = await parseKeyFile(await file.text());
        if (parsed.vote.publicKey !== publicKey) throw new Error("Este archivo de llaves no corresponde a este evento.");
        const response = await getVoteBallotsAction();
        if (!response.ok) throw new Error(response.message);
        setResults(
          await openAndTallyVotes(
            response.ciphertexts,
            parsed.vote,
            categories.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) })),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    });
  }

  const next = useCallback(() => setPosition((p) => Math.min(p + 1, slides.length - 1)), [slides.length]);
  const previous = useCallback(() => setPosition((p) => Math.max(p - 1, 0)), []);

  // Teclado del presentador: Espacio/→ siguiente, ← atrás, F pantalla completa.
  useEffect(() => {
    if (!started) return;
    function onKey(event: KeyboardEvent) {
      if (["ArrowRight", " ", "PageDown", "Enter"].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, next, previous]);

  // El año grabado en la copa: se lee en el navegador, al empezar la ceremonia.
  const [year] = useState(() => String(new Date().getFullYear()));

  if (!started) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-16">
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-extrabold">Ceremonia</h1>
            <p className="text-sm text-ink-soft">
              El notario carga su archivo de llaves. Los votos se abren en este navegador y solo se
              guardan en memoria los ganadores.
            </p>
          </div>
          {!results ? (
            <label className="inline-flex min-h-12 cursor-pointer items-center border-[1.5px] border-ink px-5 text-[15px] font-bold transition-colors hover:bg-ink/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink">
              {pending ? "Abriendo votos…" : "Elegir archivo de llaves…"}
              <input type="file" accept="application/json,.json" onChange={loadKey} disabled={pending} className="sr-only" />
            </label>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-success">
                ✓ Votos abiertos: {results.count}.
                {results.unreadable > 0 && ` ${results.unreadable} no se pudieron abrir.`}
              </p>
              <p className="text-xs text-ink-soft">
                En la presentación: <kbd>Espacio</kbd> o <kbd>→</kbd> avanza, <kbd>←</kbd> retrocede,{" "}
                <kbd>F</kbd> pantalla completa.
              </p>
              <Button size="lg" onClick={() => setStarted(true)}>
                Comenzar la ceremonia
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
        </Card>
      </main>
    );
  }

  return (
    <main
      className="theme-night fixed inset-0 z-20 flex cursor-none items-center justify-center bg-black"
      onClick={next}
      aria-live="polite"
    >
      <div className="@container relative flex aspect-video w-[min(100vw,177.78vh)] items-center justify-center overflow-hidden bg-bg accent-prize">
        {slide.kind === "category" ? (
          // La misma escena para los dos pasos de la categoría: al avanzar, sigue la animación.
          <RevealScene
            key={`categoria-${slide.index}`}
            className="absolute inset-0"
            category={categories[slide.index]!}
            number={slide.index + 1}
            total={categories.length}
            phase={slide.step}
            winnerIds={results?.byCategory[categories[slide.index]!.id]?.winnerIds ?? []}
            places={results?.byCategory[categories[slide.index]!.id]?.places}
            winnerPercent={results?.byCategory[categories[slide.index]!.id]?.winnerPercent ?? null}
            showWinnerPercent={showWinnerPercent}
            year={year}
          />
        ) : (
          <>
            <NightStage number={null} />
            <SlideView key={position} slide={slide} eventName={eventName} categories={categories} results={results!} />
          </>
        )}
        <span className="absolute right-[2cqw] bottom-[1.2cqw] z-30 text-[1cqw] text-ink-faint">
          {position + 1}/{slides.length}
        </span>
      </div>
    </main>
  );
}

function SlideView({
  slide,
  eventName,
  categories,
  results,
}: {
  slide: Exclude<Slide, { kind: "category" }>;
  eventName: string;
  categories: CategoryInfo[];
  results: VoteResults;
}) {
  if (slide.kind === "cover") {
    return (
      <div className="ceremony-rise relative z-10 space-y-[2cqw] text-center">
        <p className="inline-flex items-center gap-[0.8cqw] font-display text-[1.3cqw] font-semibold tracking-[0.3em] text-copper uppercase">
          <LogoMark className="h-[2cqw] w-[1.8cqw]" /> Esta noche
        </p>
        <h1 className="font-display text-[7cqw] leading-[0.95] font-extrabold uppercase">{eventName}</h1>
        <p className="text-[2cqw] text-ink-soft">La premiación está por comenzar</p>
      </div>
    );
  }

  // Cuántos votaron, sin nada más: los sobres ya no llevan nombre (regla 2).
  if (slide.kind === "turnout") {
    return (
      <div className="ceremony-rise relative z-10 w-full space-y-[1.5cqw] text-center">
        <p className="font-display text-[1.4cqw] font-semibold tracking-[0.3em] text-copper uppercase">La urna está abierta</p>
        <p className="font-display text-[14cqw] leading-none font-extrabold tabular-nums">{results.count}</p>
        <h1 className="font-display text-[3.4cqw] font-extrabold uppercase">
          {results.count === 1 ? "persona votó" : "personas votaron"}
        </h1>
        <p className="text-[1.6cqw] text-ink-soft">
          Cada voto se abrió aquí, sin nombre.
          {results.unreadable > 0 && ` (${results.unreadable} no se pudieron abrir.)`}
        </p>
      </div>
    );
  }

  if (slide.kind === "end") {
    return (
      <div className="ceremony-rise relative z-10 w-full space-y-[2.5cqw] text-center">
        <h1 className="font-display text-[5cqw] font-extrabold uppercase">¡Gracias por participar!</h1>
        <ul className="mx-auto grid max-w-[80cqw] grid-cols-2 gap-x-[4cqw] gap-y-[1.1cqw] text-left text-[1.6cqw]">
          {categories.map((c) => {
            const winners = results.byCategory[c.id]?.winnerIds ?? [];
            const names = c.finalists.filter((f) => winners.includes(f.id)).map((f) => f.name);
            return (
              <li key={c.id} className="flex items-baseline gap-[0.8cqw]">
                <span aria-hidden="true" className={cn("size-[0.7cqw] shrink-0", c.type === "PRIZE" ? "bg-copper" : "bg-sage")} />
                <span>
                  <span className="text-ink-soft">{c.name}:</span>{" "}
                  <strong className="font-display font-bold">{names.length ? names.join(" y ") : "desierta"}</strong>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return null;
}
