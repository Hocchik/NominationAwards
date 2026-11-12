"use client";

import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";
import type { CategoryType } from "@/generated/prisma/enums";
import { type VoteResults, openAndTallyVotes } from "@/lib/ballots/openVotes";
import { celebrate, playDrumroll, playFanfare } from "@/lib/ceremony/effects";
import { cn } from "@/lib/cn";
import { parseKeyFile } from "@/lib/crypto/keyFile";
import type { KeyPair } from "@/lib/crypto/keys";
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

/** Urna lista para abrir: la llave en memoria y los votos sellados. */
export type BallotSource = () => Promise<{ keys: KeyPair; ciphertexts: string[] }>;

export function CeremonyShow({
  eventName,
  publicKey,
  showWinnerPercent,
  categories,
  openBallots,
  intro,
}: {
  eventName: string;
  publicKey: string;
  showWinnerPercent: boolean;
  categories: CategoryInfo[];
  /** Si llega (demo), se abre la urna con un botón en vez del archivo del notario. */
  openBallots?: BallotSource;
  /** Texto de la pantalla de inicio; por defecto, el del notario. */
  intro?: ReactNode;
}) {
  const [results, setResults] = useState<VoteResults | null>(null);
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

  // Abre la urna y se queda solo con los ganadores; la llave y los votos
  // abiertos se descartan al terminar (regla 7).
  function openWith(load: BallotSource, fallback: string) {
    setError(null);
    startTransition(async () => {
      try {
        const { keys, ciphertexts } = await load();
        setResults(
          await openAndTallyVotes(
            ciphertexts,
            keys,
            categories.map((c) => ({ id: c.id, finalistIds: c.finalists.map((f) => f.id) })),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : fallback);
      }
    });
  }

  function loadKey(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    openWith(async () => {
      const parsed = await parseKeyFile(await file.text());
      if (parsed.vote.publicKey !== publicKey) throw new Error("Este archivo de llaves no corresponde a este evento.");
      const response = await getVoteBallotsAction();
      if (!response.ok) throw new Error(response.message);
      return { keys: parsed.vote, ciphertexts: response.ciphertexts };
    }, "No se pudo leer el archivo.");
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
            <h1 className="font-display text-3xl font-extrabold">Ceremonia</h1>
            <div className="text-sm text-ink-soft">
              {intro ??
                "El notario carga su archivo de llaves. Los votos se abren en este navegador y solo se guardan en memoria los ganadores."}
            </div>
          </div>
          {!results ? (
            openBallots ? (
              <Button size="lg" onClick={() => openWith(openBallots, "No se pudo abrir la urna.")} disabled={pending}>
                {pending ? "Abriendo la urna…" : "Abrir la urna"}
              </Button>
            ) : (
              <label className="inline-flex min-h-12 cursor-pointer items-center border-[1.5px] border-ink px-5 text-[15px] font-bold transition-colors hover:bg-ink/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink">
                {pending ? "Abriendo votos…" : "Elegir archivo de llaves…"}
                <input type="file" accept="application/json,.json" onChange={loadKey} disabled={pending} className="sr-only" />
              </label>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-success">
                ✓ Votos abiertos: {results.receipts.length}.
                {results.unreadable > 0 && ` ${results.unreadable} no se pudieron abrir.`}
              </p>
              <p className="text-xs text-ink-soft">
                En la presentación: <kbd>Espacio</kbd> o <kbd>→</kbd> avanza, <kbd>←</kbd> retrocede,{" "}
                <kbd>F</kbd> pantalla completa, <kbd>M</kbd> sonido.
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

  const current = slide.kind === "category" ? categories[slide.index] : null;
  return (
    <main
      className="theme-night fixed inset-0 z-20 flex cursor-none items-center justify-center bg-[#0b0f0e]"
      onClick={next}
      aria-live="polite"
    >
      <div
        className={cn(
          "@container relative flex aspect-video w-[min(100vw,177.78vh)] items-center justify-center overflow-hidden bg-bg",
          current?.type === "HONORARY" ? "accent-honor" : "accent-prize",
        )}
      >
        <NightStage number={slide.kind === "category" ? pad(slide.index + 1) : null} />
        <SlideView
          key={position}
          slide={slide}
          eventName={eventName}
          categories={categories}
          results={results!}
          showWinnerPercent={showWinnerPercent}
        />
        <span className="absolute right-[2cqw] bottom-[1.2cqw] z-10 text-[1cqw] text-ink-faint">
          {sound ? "" : "Sonido apagado · "}
          {position + 1}/{slides.length}
        </span>
      </div>
    </main>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const TYPE_LABEL = { PRIZE: "Premio", HONORARY: "Honorífica" } as const;

/** Escenario de noche: reflectores, piso en perspectiva y el número gigante al fondo. */
function NightStage({ number }: { number: string | null }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {number && (
        <span className="absolute top-[-1cqw] left-[42cqw] font-display text-[40cqw] leading-none font-extrabold tracking-[-0.04em] text-transparent [-webkit-text-stroke:0.16cqw_color-mix(in_oklab,var(--accent)_16%,transparent)]">
          {number}
        </span>
      )}
      {/* Piso */}
      <div className="absolute inset-x-0 top-[80%] bottom-0 bg-[color-mix(in_oklab,var(--bg)_75%,black)]" />
      <svg viewBox="0 0 1280 142" preserveAspectRatio="none" className="absolute inset-x-0 top-[80%] h-[20%] w-full">
        <path
          d="M640 0 L-200 142 M640 0 L100 142 M640 0 L380 142 M640 0 L640 142 M640 0 L900 142 M640 0 L1180 142 M640 0 L1480 142 M0 30 L1280 30 M0 70 L1280 70 M0 122 L1280 122"
          stroke="rgb(248 244 236 / 0.06)"
          strokeWidth="1"
          fill="none"
        />
        <path d="M0 0 L1280 0" stroke="color-mix(in oklab, var(--accent) 35%, transparent)" strokeWidth="1.5" />
      </svg>
      {/* Reflectores laterales */}
      <div className="absolute inset-0 bg-ink/[0.035] [clip-path:polygon(0_0,5.5%_0,40.6%_83%,25.8%_83%)]" />
      <div className="absolute inset-0 bg-ink/[0.035] [clip-path:polygon(94.5%_0,100%_0,95.3%_83%,77.3%_83%)]" />
      <div className="absolute inset-0 bg-ink/[0.05] [clip-path:polygon(19.5%_0,28%_0,43.7%_83%,3%_83%)]" />
      <div className="absolute top-[77%] left-[8.6%] h-[5.5%] w-[29%] rounded-[50%] bg-ink/[0.08]" />
      <div className="absolute top-[78%] left-[79%] h-[4%] w-[16.4%] rounded-[50%] bg-ink/[0.06]" />
    </div>
  );
}

/** Trofeo facetado (rombo + cono), en los tonos de la categoría. */
function Trophy({ year, className }: { year: string; className?: string }) {
  const tone = (pct: number, mix: string) => `color-mix(in oklab, var(--accent) ${pct}%, ${mix})`;
  return (
    <svg viewBox="0 0 180 420" role="img" aria-label="Trofeo" className={className}>
      <path d="M90 0 L114 26 L90 52 L66 26 Z" fill={tone(60, "white")} />
      <path d="M90 0 L114 26 L90 26 Z" fill="var(--accent)" />
      <path d="M66 26 L90 52 L90 26 Z" fill={tone(85, "black")} />
      <path d="M76 66 L104 66 L150 300 L30 300 Z" fill={tone(85, "black")} />
      <path d="M90 66 L104 66 L150 300 L90 300 Z" fill="var(--accent)" />
      <path d="M90 66 L97 66 L120 300 L90 300 Z" fill={tone(60, "white")} fillOpacity="0.55" />
      <path d="M76 66 L90 66 L90 300 L30 300 Z" fill={tone(70, "black")} />
      <path d="M30 300 L150 300 L140 318 L40 318 Z" fill={tone(55, "black")} />
      <path d="M24 330 L156 330 L170 344 L170 404 L156 418 L24 418 L10 404 L10 344 Z" fill="var(--sheet)" />
      <path d="M24 330 L156 330 L170 344 L10 344 Z" fill="var(--line)" />
      <path d="M10 344 L170 344" stroke="var(--accent)" strokeWidth="2" />
      <text x="90" y="384" textAnchor="middle" fontFamily="var(--font-unbounded)" fontWeight="700" fontSize="11" letterSpacing="2" fill="var(--accent)">
        {year}
      </text>
    </svg>
  );
}

/** Foto enmarcada en el color de la categoría, en duotono (o iniciales). */
function Portrait({ finalist, className, dim }: { finalist: FinalistInfo; className?: string; dim?: boolean }) {
  return (
    <div className={cn("bg-(--accent) p-[0.25cqw] chamfer-[var(--frame-chamfer)]", dim && "bg-line", className)}>
      <div className="relative size-full overflow-hidden [clip-path:inherit]">
        {finalist.photoUrl ? (
          <div className="photo-duotone size-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL */}
            <img src={finalist.photoUrl} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <span className="grid size-full place-items-center bg-sheet font-display font-extrabold text-(--accent)">
            {initials(finalist.name)}
          </span>
        )}
        <span className="absolute inset-0 bg-white/12 [clip-path:polygon(55%_0,80%_0,45%_100%,20%_100%)]" />
      </div>
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
  results: VoteResults;
  showWinnerPercent: boolean;
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

  if (slide.kind === "receipts") {
    return (
      <div className="ceremony-rise relative z-10 w-full space-y-[2cqw] text-center">
        <h1 className="font-display text-[4cqw] font-extrabold uppercase">Comprobantes recibidos</h1>
        <p className="text-[1.6cqw] text-ink-soft">
          {results.receipts.length} votos. Busca el tuyo: si está aquí, tu voto se contó.
          {results.unreadable > 0 && ` (${results.unreadable} no se pudieron abrir.)`}
        </p>
        <ul className="mx-auto flex max-w-[80cqw] flex-wrap justify-center gap-[0.8cqw]">
          {results.receipts.map((code, i) => (
            <li
              key={`${code}-${i}`}
              className="bg-sheet px-[1.4cqw] py-[0.7cqw] font-display text-[1.7cqw] font-bold tracking-[0.12em] chamfer-[0.7cqw]"
            >
              {code}
            </li>
          ))}
        </ul>
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

  const category = categories[slide.index];
  const result = results.byCategory[category.id];
  const topBar = (
    <div className="absolute inset-x-[4.4cqw] top-[2.7cqw] z-10 flex items-center justify-between font-display text-[1cqw] font-semibold tracking-[0.16em] uppercase">
      <span className="inline-flex items-center gap-[0.8cqw]">
        <LogoMark className="h-[1.9cqw] w-[1.7cqw] text-copper" />
        {eventName}
      </span>
      <span className="inline-flex items-center gap-[1.1cqw] text-(--accent)">
        Categoría {pad(slide.index + 1)} / {pad(categories.length)} · {TYPE_LABEL[category.type]}
        <span className="flex gap-[0.25cqw]" aria-hidden="true">
          {categories.map((c, i) => (
            <span key={c.id} className={cn("h-[0.25cqw] w-[0.65cqw]", i < slide.index ? "bg-ink" : i === slide.index ? "bg-(--accent)" : "bg-line")} />
          ))}
        </span>
      </span>
    </div>
  );
  const heading = (
    <div className="space-y-[1cqw] text-center">
      <p className="font-display text-[1.4cqw] font-semibold tracking-[0.3em] text-(--accent) uppercase">{TYPE_LABEL[category.type]}</p>
      <h1 className="font-display text-[5.5cqw] leading-[1.02] font-extrabold">{category.name}</h1>
    </div>
  );

  if (slide.step === "intro") {
    return (
      <>
        {topBar}
        <div className="ceremony-rise relative z-10 space-y-[2cqw] text-center">
          {heading}
          <p className="mx-auto max-w-[70cqw] text-[2.4cqw] text-ink-soft italic">{category.description}</p>
        </div>
      </>
    );
  }

  if (slide.step === "finalists" || slide.step === "suspense") {
    const suspense = slide.step === "suspense";
    return (
      <>
        {topBar}
        <div className="relative z-10 w-full space-y-[3cqw]">
          {heading}
          <div className="relative flex flex-wrap items-start justify-center gap-[2.4cqw]">
            {category.finalists.map((f, i) => (
              <div
                key={f.id}
                className={cn(
                  "flex w-[13cqw] flex-col items-center gap-[1cqw] text-center [--frame-chamfer:1.6cqw]",
                  !suspense && "ceremony-rise",
                  suspense && "opacity-40 grayscale transition-all duration-700",
                )}
                style={suspense ? undefined : { animationDelay: `${i * 0.45}s` }}
              >
                <Portrait finalist={f} className="h-[16cqw] w-[13cqw] text-[4cqw]" />
                <span className="font-display text-[1.6cqw] leading-tight font-bold">{f.name}</span>
              </div>
            ))}
            {suspense && <div aria-hidden="true" className="ceremony-spotlight pointer-events-none absolute inset-y-0 left-1/4 w-1/2" />}
          </div>
          {suspense && <p className="text-center text-[2.4cqw] text-ink-soft italic">Y el premio es para…</p>}
        </div>
      </>
    );
  }

  // Revelación
  const winners = category.finalists.filter((f) => result?.winnerIds.includes(f.id));
  if (winners.length === 0) {
    return (
      <>
        {topBar}
        <div className="ceremony-rise relative z-10 space-y-[2cqw] text-center">
          {heading}
          <p className="text-[2.6cqw] text-ink-soft">Categoría desierta: no hubo votos para ningún finalista.</p>
        </div>
      </>
    );
  }
  const tie = winners.length > 1;
  return (
    <>
      {topBar}
      <div className="absolute inset-x-[4.4cqw] top-[11.5cqw] bottom-[9cqw] z-10 flex items-center gap-[3.8cqw] pl-[7cqw]">
        <div className="ceremony-winner flex shrink-0 gap-[1.5cqw] [--frame-chamfer:2cqw]">
          {winners.map((w) => (
            <Portrait
              key={w.id}
              finalist={w}
              className={cn(tie ? "h-[24cqw] w-[17cqw] text-[6cqw]" : "h-[29.7cqw] w-[22.7cqw] text-[8cqw]")}
            />
          ))}
        </div>
        <div className="ceremony-rise flex min-w-0 flex-1 flex-col items-start gap-[0.95cqw]" style={{ animationDelay: "0.35s" }}>
          <span className="font-display text-[1.6cqw] font-semibold text-ink-soft">{category.name}</span>
          <span className="bg-(--accent) px-[1.1cqw] py-[0.5cqw] font-display text-[1.2cqw] font-bold tracking-[0.3em] text-bg uppercase chamfer-[0.6cqw]">
            {tie ? "Empate · comparten" : "Gana"}
          </span>
          <h2 className="font-display text-[6.7cqw] leading-[0.98] font-extrabold tracking-[-0.01em]">
            {winners.map((w) => w.name).join(" y ")}
          </h2>
          {!tie && winners[0]!.blurb && <p className="text-[2cqw] text-ink-soft italic">«{winners[0]!.blurb}»</p>}
          {showWinnerPercent && result?.winnerPercent != null && (
            <span className="mt-[0.4cqw] inline-flex items-baseline gap-[0.6cqw] border-t border-ink/20 pt-[0.8cqw] text-[1.2cqw] text-ink-faint">
              <span className="font-display text-[2cqw] font-bold text-(--accent)">≈ {result.winnerPercent} %</span>
              {tie ? "de los votos cada uno" : "de los votos"}
            </span>
          )}
        </div>
        <Trophy year={String(new Date().getFullYear())} className="h-[32.8cqw] w-[14cqw] shrink-0 max-[600px]:hidden" />
      </div>
      {/* Fila de nominados */}
      <div className="absolute inset-x-[4.4cqw] bottom-[2cqw] z-10 flex items-center gap-[1.9cqw] [--frame-chamfer:0.55cqw]">
        <span className="text-[0.95cqw] font-bold tracking-[0.16em] text-ink-faint uppercase">Nominados</span>
        {category.finalists.map((f) => {
          const won = winners.includes(f);
          return (
            <span key={f.id} className={cn("flex items-center gap-[0.9cqw]", !won && "opacity-55")}>
              <Portrait finalist={f} dim={!won} className="h-[4.2cqw] w-[3.4cqw] text-[1cqw]" />
              <span className="flex flex-col gap-[0.15cqw]">
                <span className="text-[1.25cqw] font-bold">{f.name}</span>
                <span className={cn("text-[0.85cqw] font-bold tracking-[0.12em] uppercase", won ? "text-(--accent)" : "text-ink-faint")}>
                  {won ? "Gana" : "Finalista"}
                </span>
              </span>
            </span>
          );
        })}
      </div>
    </>
  );
}
