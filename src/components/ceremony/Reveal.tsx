"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { categoryKicker, categoryTitle } from "@/lib/event/categoryKinds";
import { initials } from "@/lib/initials";
import { type StageCategory, type StageFinalist, TYPE_LABEL, Trophy, pad, pairParts } from "./Stage";
import "./reveal.css";

// La revelación de una categoría, igual en la ceremonia real y en el demo
// (CLAUDE.md §8). Muestra solo ganadores y los puestos 2.º a 4.º, nunca conteos;
// quien tuvo 0 votos no recibe puesto (regla 8).

export type RevealPhase = "nominees" | "reveal";

/** Ancho de la escena (mide 1280 × 720 y se escala). */
const W = 1280;

/** Números pseudoaleatorios fijos: el servidor y el navegador dibujan el mismo confeti. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Dónde queda cada foto ganadora en la pantalla de fiesta (inclinadas, a la izquierda). */
function winnerSpots(count: number) {
  if (count === 1) return [{ x: 96, y: 164, w: 300, h: 375, r: -5 }];
  if (count === 2)
    return [
      { x: 56, y: 150, w: 250, h: 312, r: -7 },
      { x: 196, y: 236, w: 250, h: 312, r: 5 },
    ];
  return Array.from({ length: count }, (_, i) => ({ x: 40 + i * (300 / count), y: 150 + (i % 2) * 70, w: 200, h: 250, r: i % 2 ? 5 : -6 }));
}

/** Parte un nombre en líneas cortas para que el nombre gigante no se desborde. */
function nameLines(name: string, maxChars: number) {
  const lines: string[] = [];
  for (const word of name.split(/\s+/)) {
    const last = lines.at(-1);
    if (last && (last + " " + word).length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** Tamaño de letra para que la línea más larga quepa en `width` px (Unbounded 900 ≈ 0,74 em por letra). */
const fitSize = (lines: string[], width: number, max: number) =>
  Math.min(max, Math.floor(width / (0.74 * Math.max(...lines.map((l) => l.length)))));

function PhotoOrInitials({ photoUrl, name, size }: { photoUrl: string | null | undefined; name: string; size: number }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL
    <img src={photoUrl} alt="" />
  ) : (
    <span className="rv-sample">
      <span className="rv-initials" style={{ fontSize: size }}>
        {initials(name)}
      </span>
    </span>
  );
}

function Photo({ finalist, initialsSize }: { finalist: StageFinalist; initialsSize: number }) {
  // Las parejas van con la foto partida al medio: una mitad para cada uno.
  const [a, b] = finalist.kind === "pair" ? pairParts(finalist.name) : [finalist.name, ""];
  return (
    <span className="rv-frame">
      <span className="rv-fill">
        <span className="rv-photo">
          {finalist.kind === "pair" ? (
            <>
              <span className="rv-half">
                <PhotoOrInitials photoUrl={finalist.photoUrl} name={a} size={Math.round(initialsSize * 0.62)} />
              </span>
              <span className="rv-half rv-half-b">
                <PhotoOrInitials photoUrl={finalist.partnerPhotoUrl} name={b} size={Math.round(initialsSize * 0.62)} />
              </span>
              <span className="rv-split" />
            </>
          ) : (
            <PhotoOrInitials photoUrl={finalist.photoUrl} name={finalist.name} size={initialsSize} />
          )}
        </span>
      </span>
    </span>
  );
}

export function RevealScene({
  category,
  number,
  total,
  phase,
  winnerIds,
  places = {},
  winnerPercent,
  showWinnerPercent,
  year,
  className,
}: {
  category: StageCategory;
  /** Posición de la categoría en la ceremonia (1, 2…). */
  number: number;
  total: number;
  phase: RevealPhase;
  winnerIds: string[];
  /** Puesto (2 a 4) de los demás finalistas; los que no están no tienen puesto. */
  places?: Record<string, number>;
  winnerPercent: number | null;
  showWinnerPercent: boolean;
  /** Año grabado en la copa (se pasa desde afuera: aquí no se lee la hora). */
  year: string;
  className?: string;
}) {
  // La escena mide 1280 × 720 y se escala al ancho disponible.
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / W));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const prize = category.type === "PRIZE";
  const reveal = phase === "reveal";
  const finalists = category.finalists;
  const winners = finalists.filter((f) => winnerIds.includes(f.id));
  const n = Math.max(finalists.length, 1);

  // Fila de finalistas, centrada; con más de 5 (datos viejos, antes del tope) se
  // achican. Con el rótulo «Más propenso/a a…» el título baja ~40 px: las tarjetas
  // son un poco más bajas para que la consigna (hasta 3 líneas) no las toque.
  const gap = n <= 5 ? 40 : 24;
  const cw = n <= 5 ? (categoryKicker(category) ? 176 : 200) : Math.floor((W - 120 - (n - 1) * gap) / n);
  const ch = Math.round(cw * 1.25);
  const left = (W - (n * cw + (n - 1) * gap)) / 2;
  const spots = winnerSpots(winners.length);
  const cardX = (i: number) => left + i * (cw + gap);
  const winnerIndexes = finalists.flatMap((f, i) => (winnerIds.includes(f.id) ? [i] : []));
  const spotCenter = winnerIndexes.length
    ? winnerIndexes.reduce((sum, i) => sum + cardX(i) + cw / 2, 0) / winnerIndexes.length
    : W / 2;

  // Título: la segunda mitad en cursiva («El alma <em>de la fiesta</em>»).
  // En «Más propenso/a a…» el rótulo va arriba y el título es el final de la frase.
  const kicker = categoryKicker(category);
  const fullTitle = categoryTitle(category);
  const words = category.name.split(/\s+/);
  const cut = words.length > 1 ? Math.floor(words.length / 2) : words.length;
  const titleA = words.slice(0, cut).join(" ");
  const titleB = words.slice(cut).join(" ");

  const tie = winners.length > 1;
  const single = winners[0];
  const lines = single ? nameLines(single.name, Math.max(9, Math.ceil(single.name.length / 3))) : [];
  const nameSize = single ? fitSize(lines, 440, 84) : 0;
  const tieSize = tie ? fitSize(winners.map((w) => w.name), 440, 52) : 0;
  const isOption = single?.kind === "option";
  // En la ceremonia no se usan apodos (decisión del usuario, 2026-11-25): se felicita por el nombre.
  const pair = single?.kind === "pair";
  const firstName = single && !isOption && !pair && !single.external ? single.name.split(/\s+/)[0] : null;
  // Cuántas personas ganan: una pareja son dos; un empate de parejas, más de dos.
  const people = winners.reduce((sum, w) => sum + (w.kind === "pair" ? 2 : 1), 0);
  const cheer =
    tie || pair
      ? people === 2 ? "¡Felicidades a los dos!" : "¡Felicidades a todos!"
      : firstName ? `¡Felicidades, ${firstName}!` : "¡Felicidades!";
  const followers = finalists
    .filter((f) => places[f.id])
    .sort((a, b) => places[a.id]! - places[b.id]!)
    .map((f) => ({ id: f.id, name: f.name, place: places[f.id]! }));

  // Banderines y confeti: el acento de la categoría, la tinta y el otro acento.
  const other = prize ? "var(--sage)" : "var(--copper)";
  const rnd = seeded(13 + number);
  // Por los costados: el centro (nombre y «Le siguen») queda limpio.
  const confetti = Array.from({ length: 52 }, (_, i) => ({
    x: i % 2 ? 940 + rnd() * 330 : 10 + rnd() * 430,
    w: 7 + rnd() * 6,
    h: 10 + rnd() * 8,
    c: [`var(--ink)`, "var(--accent)", other][i % 3],
    d: 4.4 + rnd() * 1.8,
    t: 2 + rnd() * 1.6,
    sway: (rnd() - 0.5) * 120,
    land: 640 + rnd() * 60,
    spin: (rnd() - 0.5) * 720,
  }));
  const flags = Array.from({ length: 23 }, (_, i) => {
    const x = 30 + i * 55;
    const t = (x - 640) / 640;
    return {
      x: x - 15,
      y: 14 + 54 * (1 - t * t) - 2,
      r: (Math.atan((-108 * t) / 640) * 180) / Math.PI,
      c: ["var(--accent)", "var(--ink)", other][i % 3],
      d: 3.6 + Math.abs(i - 11) * 0.05,
    };
  });

  const label = `Categoría ${number} de ${total}: ${fullTitle}.`;
  const announcement = !reveal
    ? `${label} Nominados: ${finalists.map((f) => f.name).join(", ")}.`
    : winners.length
      ? `${label} ${tie ? "Empate" : "Primer puesto"}: ${winners.map((w) => w.name).join(" y ")}.`
      : `${label} Categoría desierta.`;

  return (
    <div
      ref={box}
      role="img"
      aria-label={announcement}
      className={cn("relative aspect-video w-full overflow-hidden", prize ? "accent-prize" : "accent-honor", className)}
    >
      <div
        className={cn("rv-root", reveal && "rv-go")}
        style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
        aria-hidden="true"
      >
        {/* Marcas de escena y piso */}
        <div className="absolute top-[38px] right-12 left-12 flex justify-between text-base text-line-strong">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i}>+</span>
          ))}
        </div>
        <div className="absolute inset-x-0 top-[600px] h-px bg-[linear-gradient(90deg,transparent,var(--line)_20%,var(--line)_80%,transparent)]" />

        {/* Número gigante: se llena de color durante el suspenso */}
        <span className="rv-num rv-display absolute top-10 right-[30px] text-[300px] leading-[0.8] font-black tracking-[-0.07em]">
          {pad(number)}
        </span>

        {/* 1 · Título de la categoría */}
        <div className="rv-pre absolute top-20 left-16 z-[6] max-w-[820px]">
          <span className="rv-in rv-chip" style={{ animationDelay: "0.2s" }}>
            Categoría {pad(number)} · {TYPE_LABEL[category.type]}
          </span>
          {kicker && (
            <span className="rv-in mt-4 block text-[22px] font-bold text-(--accent) italic" style={{ animationDelay: "0.3s" }}>
              {kicker}…
            </span>
          )}
          <h2 className="rv-display mt-4 text-[64px] leading-none font-extrabold tracking-[-0.04em]">
            <span className="rv-mask">
              <span className="rv-word" style={{ animationDelay: "0.4s" }}>
                {titleA} {titleB && <em>{titleB}</em>}
              </span>
            </span>
          </h2>
          <p className="rv-in mt-3 line-clamp-3 text-lg leading-7 text-ink-soft" style={{ animationDelay: "1s" }}>
            {category.description}
          </p>
        </div>

        {/* 2 · Finalistas (en el orden de la categoría, nunca por votos) */}
        {finalists.map((f, i) => {
          const w = winners.indexOf(f);
          const spot = spots[w];
          return (
            <div
              key={f.id}
              className={cn("rv-card", w >= 0 ? "win" : "lose")}
              style={
                {
                  "--x0": `${cardX(i)}px`,
                  "--y0": `${550 - ch}px`,
                  "--cw": `${cw}px`,
                  "--ch": `${ch}px`,
                  "--d": `${1.5 + i * Math.min(0.32, 1.6 / n)}s`,
                  ...(spot && { "--fx": `${spot.x}px`, "--fy": `${spot.y}px`, "--fw": `${spot.w}px`, "--fh": `${spot.h}px`, "--fr": `${spot.r}deg` }),
                  zIndex: w >= 0 ? 7 : 3,
                } as CSSProperties
              }
            >
              <Photo finalist={f} initialsSize={Math.round(cw * 0.3)} />
              <span className="rv-label">
                <span className="rv-display block text-[17px] leading-tight font-bold tracking-[-0.01em]">{f.name}</span>
              </span>
              {/* En la primera foto ganadora: en un empate, la de atrás, para no tapar el nombre */}
              {reveal && w === 0 && f.kind !== "option" && (
                <span className="rv-pop rv-bubble" style={{ animationDelay: "6.4s" }}>
                  {tie || f.kind === "pair" ? "¡que hablen!" : "¡que hable!"}
                </span>
              )}
            </div>
          );
        })}

        {/* 3 · Suspenso → destello → fiesta (se monta al avanzar) */}
        {reveal && (
          <>
            <div className="rv-vignette" />
            <div className="rv-spot" style={{ "--spot": `${spotCenter - 180}px` } as CSSProperties} />
            <div className="rv-beam" style={{ "--beam": `${spotCenter - 100}px` } as CSSProperties} />
            <p className="rv-drum absolute inset-x-0 top-[640px] z-[6] m-0 text-center text-[13px] font-bold tracking-[0.34em] text-ink-faint uppercase">
              Y el premio es para…
            </p>

            {winners.length > 0 ? (
              <>
                {/* Banderines colgados arriba: decoran sin tocar ningún texto */}
                <svg viewBox="0 0 1280 720" width="1280" height="720" className="rv-in absolute inset-0 z-[1]" style={{ animationDelay: "3.5s" }}>
                  <path d="M-10 14 Q640 122 1290 14" fill="none" stroke="color-mix(in oklab, var(--ink) 35%, transparent)" strokeWidth="2" />
                </svg>
                {flags.map((g, i) => (
                  <span key={i} className="rv-flag" style={{ left: g.x, top: g.y, rotate: `${g.r}deg`, background: g.c, animationDelay: `${g.d}s` }} />
                ))}

                {/* Confeti: cae por detrás de los textos y se queda en el piso */}
                <div className="absolute inset-0 z-[1]">
                  {confetti.map((k, i) => (
                    <span
                      key={i}
                      className="rv-confetti"
                      style={
                        {
                          left: k.x,
                          width: k.w,
                          height: k.h,
                          background: k.c,
                          "--d": `${k.d}s`,
                          "--t": `${k.t}s`,
                          "--sway": `${k.sway}px`,
                          "--land": `${k.land}px`,
                          "--spin": `${k.spin}deg`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>

                {/* Trofeo: copa para premio, laurel para honorífica */}
                <div
                  className="rv-pop absolute top-[176px] left-[966px] z-[3] h-[312px] w-[240px] drop-shadow-[0_20px_24px_rgb(0_0_0/0.55)]"
                  style={{ animationDelay: "5.2s" }}
                >
                  <div className="rv-bounce">
                    <Trophy type={category.type} year={year} className="size-full" />
                  </div>
                </div>

                {/* El nombre, al centro */}
                <div className="absolute top-[160px] left-[476px] z-[4] w-[440px]">
                  <span className="rv-in rv-chip" style={{ animationDelay: "4.5s" }}>
                    {tie ? "Empate" : "Primer puesto"} · {fullTitle}
                  </span>
                  <span className="rv-in mt-[18px] block text-[30px] font-extrabold text-(--accent) italic" style={{ animationDelay: "4.7s" }}>
                    {cheer}
                  </span>
                  <h1 className="rv-display mt-1.5 leading-[0.92] font-black tracking-[-0.055em]" style={{ fontSize: tie ? tieSize : nameSize }}>
                    {(tie ? winners.map((w) => w.name) : lines).map((line, i) => (
                      <span key={i} className="rv-mask">
                        <span className="rv-word" style={{ animationDelay: `${4.8 + i * 0.15}s` }}>
                          {tie && i > 0 && <em className="mr-[0.25em] text-[0.6em]">y</em>}
                          {line}
                        </span>
                      </span>
                    ))}
                  </h1>
                  {showWinnerPercent && winnerPercent != null && (
                    <p className="rv-in mt-4 flex items-baseline gap-3" style={{ animationDelay: "5.5s" }}>
                      <span className="rv-display text-[34px] font-extrabold">≈ {winnerPercent} %</span>
                      <span className="text-[17px] text-ink-soft">{tie ? "de los votos, cada uno" : "de los votos"}</span>
                    </p>
                  )}
                  {followers.length > 0 && (
                    <div className="rv-in mt-[26px] border-t border-ink/20 pt-3" style={{ animationDelay: "6.2s" }}>
                      <span className="block text-xs font-bold tracking-[0.24em] text-ink-faint uppercase">Le siguen</span>
                      {followers.map((o) => (
                        <span key={o.id} className="mt-2 flex items-baseline gap-3 text-lg">
                          <b className="rv-display w-[34px] text-base text-(--accent)">{o.place}.º</b>
                          <span className="font-semibold">{o.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rv-in absolute inset-x-0 top-[300px] z-[6] text-center" style={{ animationDelay: "3.4s" }}>
                <p className="rv-display text-[56px] font-extrabold">Categoría desierta</p>
                <p className="mt-3 text-xl text-ink-soft">No hubo votos para ningún finalista.</p>
              </div>
            )}

            <div className="rv-flash" />
          </>
        )}
      </div>
    </div>
  );
}
