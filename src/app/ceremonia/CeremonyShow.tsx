"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CategoryType } from "@/generated/prisma/enums";
import { type VoteBallot, voteBallotSchema } from "@/lib/ballots/vote";
import { type CategoryResult, tallyVotes } from "@/lib/ballots/voteTally";
import { celebrate, playDrumroll, playFanfare } from "@/lib/ceremony/effects";
import { cn } from "@/lib/cn";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import { openPayload } from "@/lib/crypto/open";
import { initials } from "@/lib/initials";
import { getVoteBallotsAction } from "./actions";

// Pantalla de la ceremonia para el proyector (16:9). Los votos se abren aquí,
// con la llave del notario en memoria (regla 7); solo se muestran ganadores y,
// si el evento lo permite, su % redondeado (regla 8).

interface FinalistInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  blurb: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  finalists: FinalistInfo[];
}

type Slide =
  | { kind: "cover" }
  | { kind: "receipts" }
  | { kind: "category"; index: number; step: "intro" | "finalists" | "suspense" | "winner" }
  | { kind: "end" };

const SUSPENSE_SECONDS = 3;

interface Results {
  byCategory: Record<string, CategoryResult>;
  receipts: string[];
  unreadable: number;
}

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
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);
  const [sound, setSound] = useState(true);

  const slides = useMemo<Slide[]>(
    () => [
      { kind: "cover" },
      { kind: "receipts" },
      ...categories.flatMap((_, index) =>
        (["intro", "finalists", "suspense", "winner"] as const).map((step): Slide => ({ kind: "category", index, step })),
      ),
      { kind: "end" },
    ],
    [categories],
  );
  const slide = slides[Math.min(position, slides.length - 1)];

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
        const ballots: VoteBallot[] = [];
        let unreadable = 0;
        for (const ciphertext of response.ciphertexts) {
          try {
            const result = voteBallotSchema.safeParse(await openPayload(ciphertext, parsed.vote));
            if (result.success) ballots.push(result.data);
            else unreadable++;
          } catch {
            unreadable++;
          }
        }
        // Solo quedan en memoria los ganadores; la llave y los votos abiertos se descartan.
        const tallies = tallyVotes(
          ballots,
          categories.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) })),
        );
        setResults({
          byCategory: Object.fromEntries(tallies.map((t) => [t.categoryId, t])),
          receipts: ballots.map((b) => b.receipt).sort(),
          unreadable,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    });
  }

  const next = useCallback(() => setPosition((p) => Math.min(p + 1, slides.length - 1)), [slides.length]);
  const previous = useCallback(() => setPosition((p) => Math.max(p - 1, 0)), []);

  // Teclado del presentador: Espacio/→ siguiente, ← atrás, F pantalla completa, M sonido.
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
      } else if (event.key.toLowerCase() === "m") {
        setSound((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, next, previous]);

  // Suspenso: redoble y, al terminar, se revela solo. Revelación: fanfarria y confeti.
  useEffect(() => {
    if (!started || slide.kind !== "category") return;
    const category = categories[slide.index];
    const result = results?.byCategory[category.id];
    if (slide.step === "suspense") {
      if (sound) playDrumroll(SUSPENSE_SECONDS);
      const timer = setTimeout(next, SUSPENSE_SECONDS * 1000 + 300);
      return () => clearTimeout(timer);
    }
    if (slide.step === "winner" && result?.winnerIds.length) {
      if (sound) playFanfare();
      celebrate(category.type === "PRIZE" ? "prize" : "honor");
    }
  }, [started, slide, categories, results, sound, next]);

  if (!started) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-16">
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold">Ceremonia</h1>
            <p className="text-sm text-muted">
              El notario carga su archivo de llaves. Los votos se abren en este navegador y solo se
              guardan en memoria los ganadores.
            </p>
          </div>
          {!results ? (
            <label className="glass inline-flex min-h-12 cursor-pointer items-center rounded-xl px-5 text-sm font-semibold">
              {pending ? "Abriendo votos…" : "Elegir archivo de llaves…"}
              <input type="file" accept="application/json,.json" onChange={loadKey} disabled={pending} className="sr-only" />
            </label>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-success">
                ✓ Votos abiertos: {results.receipts.length}.
                {results.unreadable > 0 && ` ${results.unreadable} no se pudieron abrir.`}
              </p>
              <p className="text-xs text-muted">
                En la presentación: <kbd>Espacio</kbd> o <kbd>→</kbd> avanza, <kbd>←</kbd> retrocede,{" "}
                <kbd>F</kbd> pantalla completa, <kbd>M</kbd> sonido.
              </p>
              <Button size="lg" onClick={() => setStarted(true)}>
                Comenzar la ceremonia
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </Card>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 z-20 flex cursor-none items-center justify-center bg-background/80"
      onClick={next}
      aria-live="polite"
    >
      <div className="@container relative flex aspect-video w-[min(100vw,177.78vh)] items-center justify-center overflow-hidden px-[6cqw]">
        <SlideView
          key={position}
          slide={slide}
          eventName={eventName}
          categories={categories}
          results={results!}
          showWinnerPercent={showWinnerPercent}
        />
        <span className="absolute right-[2cqw] bottom-[1.5cqw] text-[1.1cqw] text-muted/60">
          {sound ? "" : "Sonido apagado · "}
          {position + 1}/{slides.length}
        </span>
      </div>
    </main>
  );
}

function FinalistCard({
  finalist,
  size,
  className,
  style,
}: {
  finalist: FinalistInfo;
  size: "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}) {
  const box = size === "lg" ? "size-[18cqw]" : "size-[11cqw]";
  return (
    <div className={cn("glass flex flex-col items-center gap-[1cqw] rounded-[1.5cqw] p-[1.5cqw] text-center", className)} style={style}>
      {finalist.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL
        <img src={finalist.photoUrl} alt="" className={cn(box, "rounded-[1cqw] object-cover")} />
      ) : (
        <span className={cn(box, "grid place-items-center rounded-[1cqw] bg-surface-strong font-display", size === "lg" ? "text-[6cqw]" : "text-[3.5cqw]")}>
          {initials(finalist.name)}
        </span>
      )}
      <span className={cn("font-semibold", size === "lg" ? "text-[3cqw]" : "text-[1.8cqw]")}>{finalist.name}</span>
      {size === "lg" && finalist.blurb && <span className="text-[1.6cqw] text-muted italic">«{finalist.blurb}»</span>}
    </div>
  );
}

function SlideView({
  slide,
  eventName,
  categories,
  results,
  showWinnerPercent,
}: {
  slide: Slide;
  eventName: string;
  categories: CategoryInfo[];
  results: Results;
  showWinnerPercent: boolean;
}) {
  if (slide.kind === "cover") {
    return (
      <div className="ceremony-rise space-y-[2cqw] text-center">
        <p className="text-[1.6cqw] tracking-[0.4em] text-gold uppercase">Esta noche</p>
        <h1 className="font-display text-[7cqw] leading-none font-bold text-gold-gradient">{eventName}</h1>
        <p className="text-[2cqw] text-muted">La premiación está por comenzar</p>
      </div>
    );
  }

  if (slide.kind === "receipts") {
    return (
      <div className="ceremony-rise w-full space-y-[2cqw] text-center">
        <h1 className="font-display text-[4cqw] font-semibold">Comprobantes recibidos</h1>
        <p className="text-[1.6cqw] text-muted">
          {results.receipts.length} votos. Busca el tuyo: si está aquí, tu voto se contó.
          {results.unreadable > 0 && ` (${results.unreadable} no se pudieron abrir.)`}
        </p>
        <ul className="mx-auto flex max-w-[80cqw] flex-wrap justify-center gap-[1cqw]">
          {results.receipts.map((code, i) => (
            <li key={`${code}-${i}`} className="glass rounded-[0.8cqw] px-[1.4cqw] py-[0.6cqw] font-mono text-[1.8cqw] tracking-widest">
              {code}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (slide.kind === "end") {
    return (
      <div className="ceremony-rise w-full space-y-[2.5cqw] text-center">
        <h1 className="font-display text-[5cqw] font-bold text-gold-gradient">¡Gracias por participar!</h1>
        <ul className="mx-auto grid max-w-[80cqw] grid-cols-2 gap-x-[4cqw] gap-y-[1cqw] text-left text-[1.6cqw]">
          {categories.map((c) => {
            const winners = results.byCategory[c.id]?.winnerIds ?? [];
            const names = c.finalists.filter((f) => winners.includes(f.id)).map((f) => f.name);
            return (
              <li key={c.id}>
                <span className="text-muted">{c.name}:</span> <strong>{names.length ? names.join(" y ") : "desierta"}</strong>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const category = categories[slide.index];
  const isPrize = category.type === "PRIZE";
  const result = results.byCategory[category.id];
  const header = (
    <div className="space-y-[1cqw] text-center">
      <p className={cn("text-[1.5cqw] tracking-[0.35em] uppercase", isPrize ? "text-gold" : "text-honor")}>
        {isPrize ? "Premio" : "Honorífica"} · {slide.index + 1} de {categories.length}
      </p>
      <h1 className={cn("font-display text-[5.5cqw] leading-tight font-bold", isPrize ? "text-gold-gradient" : "text-honor-gradient")}>
        {category.name}
      </h1>
    </div>
  );

  if (slide.step === "intro") {
    return (
      <div className="ceremony-rise space-y-[2cqw] text-center">
        {header}
        <p className="mx-auto max-w-[70cqw] text-[2.4cqw] text-muted">{category.description}</p>
      </div>
    );
  }

  if (slide.step === "finalists" || slide.step === "suspense") {
    const suspense = slide.step === "suspense";
    return (
      <div className="w-full space-y-[3cqw]">
        {header}
        <div className="relative flex flex-wrap justify-center gap-[2cqw]">
          {category.finalists.map((f, i) => (
            <FinalistCard
              key={f.id}
              finalist={f}
              size="md"
              className={cn(!suspense && "ceremony-rise", suspense && "opacity-40 grayscale transition-all duration-700")}
              style={suspense ? undefined : { animationDelay: `${i * 0.45}s` }}
            />
          ))}
          {suspense && <div aria-hidden="true" className="ceremony-spotlight pointer-events-none absolute inset-y-0 left-1/4 w-1/2" />}
        </div>
        {suspense && <p className="text-center text-[2.4cqw] text-muted">Y el premio es para…</p>}
      </div>
    );
  }

  // Revelación
  const winners = category.finalists.filter((f) => result?.winnerIds.includes(f.id));
  if (winners.length === 0) {
    return (
      <div className="ceremony-rise space-y-[2cqw] text-center">
        {header}
        <p className="text-[2.6cqw] text-muted">Categoría desierta: no hubo votos para ningún finalista.</p>
      </div>
    );
  }
  return (
    <div className="w-full space-y-[2.5cqw] text-center">
      {header}
      <p className="text-[2.2cqw] text-muted">{winners.length > 1 ? "¡Empate! Comparten el premio:" : "¡Y gana…!"}</p>
      <div className="flex flex-wrap justify-center gap-[3cqw]">
        {winners.map((w) => (
          <FinalistCard
            key={w.id}
            finalist={w}
            size="lg"
            className={cn("ceremony-winner", isPrize ? "border-gold/70 shadow-[0_0_6cqw_-1cqw_rgb(212_175_55/0.6)]" : "border-honor/70 shadow-[0_0_6cqw_-1cqw_rgb(184_181_255/0.6)]")}
          />
        ))}
      </div>
      {showWinnerPercent && result?.winnerPercent != null && (
        <p className="text-[1.8cqw] text-muted">con el {result.winnerPercent} % de los votos</p>
      )}
    </div>
  );
}
