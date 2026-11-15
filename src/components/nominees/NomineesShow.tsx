import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { LoaderLink } from "@/components/ui/LoaderLink";
import { cn } from "@/lib/cn";
import type { GroupPhotoView } from "@/lib/event/groupPhotos";
import { initials } from "@/lib/initials";
import "./show.css";

// Nominados — «Estreno con recuerdos» (lienzo, Ronda 8 · A2). Siempre de noche.
// 1) Entrada: las tres fotos grupales en abanico; al bajar, cada una pasa a
//    pantalla completa como diapositiva, con una frase. 2) Un capítulo por
//    categoría con sus finalistas (nombre y apodo, sin conteos: regla 8).
// Mientras no se revelan, cada capítulo muestra cartas boca abajo y al
// navegador no llega ningún finalista.

export interface BoardFinalist {
  id: string;
  name: string;
  photoUrl: string | null;
  /** Primer apodo del invitado, si es del grupo y tiene. */
  nickname: string | null;
  /** Referente de fuera del grupo (no es participante). */
  external: boolean;
}

export interface BoardCategory {
  id: string;
  /** Número del capítulo: "01", "02"… */
  num: string;
  name: string;
  description: string;
  type: "PRIZE" | "HONORARY";
  /** Vacío mientras los nominados no se revelan. */
  finalists: BoardFinalist[];
}

/** El botón Votar: sin `href` se ve pero no se puede tocar (todavía no abre, ya votaste o cerró). */
export interface VoteCta {
  label: string;
  href: string | null;
  /** Si viene, el botón muestra la carga antes de ir a votar (el demo, que no espera al servidor). */
  loadingLabel?: string;
}

/** Frase final de la entrada: «{lead} <em>{em}</em> {tail}». */
export interface ClosingLine {
  lead: string;
  em: string;
  tail: string;
}

const TYPE_LABEL = { PRIZE: "Premio", HONORARY: "Honorífica" } as const;

// Siluetas de un grupo para las fotos de marcador (fijas, para que el servidor y
// el navegador dibujen lo mismo).
const CROWDS = [
  [[10, 20, 4.4], [17, 23, 3.6], [25, 18, 4.6], [33, 22, 3.8], [41, 19, 4.4], [49, 21, 4]],
  [[12, 21, 4.2], [21, 18, 4.6], [30, 22, 3.8], [39, 19, 4.4], [48, 22, 3.6]],
  [[9, 22, 3.8], [16, 19, 4.4], [23, 21, 4], [30, 18, 4.6], [37, 22, 3.8], [44, 20, 4.2], [51, 21, 3.8]],
] as const;

function Crowd({ index }: { index: number }) {
  const people = CROWDS[index % CROWDS.length]!;
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {people.map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`} fill="#000" fillOpacity="0.38">
          <circle cx={cx} cy={cy} r={r} />
          <ellipse cx={cx} cy={cy + r * 3.3} rx={r * 1.9} ry={r * 2.1} />
        </g>
      ))}
    </svg>
  );
}

// Orden en que pasan a pantalla completa: la del centro, la de la izquierda y la de la derecha.
const SLIDES = [
  { photo: 0, side: 0, range: "contain 8% contain 40%", delay: "0.4s", z: 3 },
  { photo: 1, side: -1, range: "contain 26% contain 62%", delay: "0.65s", z: 2 },
  { photo: 2, side: 1, range: "contain 48% contain 100%", delay: "0.77s", z: 1 },
] as const;

export function NomineesShow({
  eyebrow,
  subline,
  revealed,
  categories,
  slots,
  revealNote,
  groupPhotos,
  countdown,
  vote,
  closing,
  strip,
}: {
  eyebrow: string;
  subline: string;
  revealed: boolean;
  categories: BoardCategory[];
  /** Cartas boca abajo por categoría mientras no se revelan. */
  slots: number;
  /** Texto bajo cada carta boca abajo. */
  revealNote: string;
  groupPhotos: GroupPhotoView[];
  countdown: { title: string; target: string } | null;
  vote: VoteCta | null;
  closing: ClosingLine;
  /** Franja de participación (si hay sesión), entre la entrada y los capítulos. */
  strip?: ReactNode;
}) {
  const lines: ClosingLine[] = [
    { lead: "Un año", em: "de momentos", tail: "juntos." },
    { lead: "Viajes, cumpleaños", em: "y noches", tail: "que no se repiten." },
    closing,
  ];
  const sayRanges = ["contain 17% contain 38%", "contain 37% contain 60%", "contain 70% contain 140%"];

  return (
    <div className="theme-night bg-bg text-ink">
      {/* 1 · Entrada */}
      <section className="nx-intro" aria-label="Entrada">
        <div className="nx-stage">
          {SLIDES.map((s, k) => {
            const photo = groupPhotos[s.photo];
            const last = k === SLIDES.length - 1;
            return (
              <div key={s.photo} className="nx-rise-in" style={{ animationDelay: s.delay, zIndex: s.z }}>
                <div
                  className={cn("nx-slide", last && "is-last")}
                  style={{ "--side": s.side, "--lift": Math.abs(s.side) * 3, animationRange: s.range } as CSSProperties}
                >
                  <span className="nx-frame">
                    <span className="nx-fill">
                      <span className="nx-zoom">
                        {photo?.photoUrl ? (
                          // .photo-duotone fija position:relative fuera de las capas de Tailwind: el estilo en línea lo gana
                          <span className="photo-duotone" style={{ position: "absolute", inset: 0, display: "block" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- foto guardada como data URL */}
                            <img src={photo.photoUrl} alt="" />
                          </span>
                        ) : (
                          <span className="nx-sample">
                            <Crowd index={s.photo} />
                          </span>
                        )}
                      </span>
                      <span className="nx-scrim" />
                      {last && <span className="nx-shade" />}
                      {photo?.caption && (
                        <span className="absolute right-[clamp(10px,1.6cqw,26px)] bottom-[clamp(10px,1.6cqw,26px)] inline-flex max-w-[calc(100%-24px)] items-center gap-2.5 truncate bg-black px-3 py-1.5 text-[clamp(11px,1cqw,15px)] font-semibold italic chamfer-8">
                          <b className="font-display text-[0.85em] not-italic tracking-[0.12em] text-copper">0{s.photo + 1}</b>
                          {photo.caption}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}

          {/* Arriba: cuenta regresiva y acción; a la derecha, de qué se trata */}
          <div className="nx-leave absolute top-5 right-4 left-4 z-[4] flex flex-wrap items-start justify-between gap-4 sm:right-8 sm:left-8 lg:top-8 lg:right-16 lg:left-16">
            <div className="flex flex-col items-start gap-3">
              {countdown && <Countdown title={countdown.title} target={countdown.target} />}
              {vote && <VoteButton vote={vote} className="max-sm:min-h-11" />}
            </div>
            <div className="max-w-xs space-y-1.5 text-right max-sm:hidden">
              <p className="text-xs font-bold tracking-[0.18em] text-copper uppercase">{eyebrow}</p>
              <p className="text-[15px] leading-snug text-ink-soft">{subline}</p>
            </div>
          </div>

          {/* La palabra gigante */}
          <div className="nx-sink absolute inset-x-0 bottom-[3svh] z-[2] px-4 sm:px-0">
            <h1 className="overflow-hidden text-center font-display leading-[0.86] font-black tracking-[-0.055em] uppercase max-sm:text-left">
              {/* .nx-word fija display:block, así que el «solo PC / solo celular» va en un envoltorio */}
              <span className="block max-sm:hidden">
                <span className="nx-word text-[12cqw]">Nominados</span>
              </span>
              <span className="block sm:hidden">
                <span className="nx-word text-[20.5cqw]">
                  Nomi
                  <br />
                  nados
                </span>
              </span>
            </h1>
            <div className="flex justify-between px-0 pt-3 text-[11px] font-bold tracking-[0.22em] uppercase sm:px-8 sm:text-[13px] lg:px-16">
              <span className="text-ink-soft">{eyebrow}</span>
              <span>Baja para entrar ↓</span>
            </div>
          </div>

          {/* Una frase por diapositiva */}
          {lines.map((line, i) => (
            <p
              key={line.lead}
              className={cn(
                "nx-say absolute bottom-[10svh] z-[6] m-0 max-w-[min(64cqw,60rem)] font-display text-[clamp(30px,4.6cqw,66px)] leading-[1.04] font-medium tracking-[-0.03em] [text-shadow:0_2px_30px_rgb(0_0_0/0.55)] max-sm:right-4 max-sm:left-4 max-sm:max-w-none",
                i === 1 ? "right-[clamp(16px,4.4cqw,64px)] text-right max-sm:text-left" : "left-[clamp(16px,4.4cqw,64px)]",
              )}
              style={{ animationRange: sayRanges[i] }}
            >
              {line.lead} <em className="font-sans font-semibold italic">{line.em}</em> {line.tail}
            </p>
          ))}
        </div>
      </section>

      {strip && <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-16">{strip}</div>}

      {/* 2 · Un capítulo por categoría */}
      {categories.map((c, ci) => (
        <Chapter key={c.id} category={c} index={ci} all={categories} revealed={revealed} slots={slots} revealNote={revealNote} />
      ))}

      {/* 3 · Cierre */}
      {vote?.href && (
        <section className="mx-auto flex max-w-[90rem] flex-wrap items-end justify-between gap-8 border-t border-line px-4 py-20 sm:px-6 lg:px-16 lg:py-28">
          <p className="max-w-3xl font-display text-[clamp(32px,4.4vw,64px)] leading-[1.02] font-medium tracking-[-0.03em]">
            {revealed ? (
              <>
                ¿Ya sabes <em className="font-sans font-semibold italic">por quién</em> votar?
              </>
            ) : (
              <>
                Los nominados <em className="font-sans font-semibold italic">se revelan</em> pronto.
              </>
            )}
          </p>
          <VoteButton vote={vote} size="lg" className="max-sm:w-full" />
        </section>
      )}
    </div>
  );
}

function VoteButton({ vote, size, className }: { vote: VoteCta; size?: "lg"; className?: string }) {
  if (vote.href && vote.loadingLabel) {
    return (
      <LoaderLink href={vote.href} label={vote.loadingLabel} className={buttonClasses({ size, className })}>
        {vote.label}
      </LoaderLink>
    );
  }
  if (vote.href) {
    return (
      <Link href={vote.href} className={buttonClasses({ size, className })}>
        {vote.label}
      </Link>
    );
  }
  return (
    <span aria-disabled="true" className={buttonClasses({ size, className: cn("pointer-events-none opacity-45 saturate-50", className) })}>
      {vote.label}
    </span>
  );
}

function Chapter({
  category,
  index,
  all,
  revealed,
  slots,
  revealNote,
}: {
  category: BoardCategory;
  index: number;
  all: BoardCategory[];
  revealed: boolean;
  slots: number;
  revealNote: string;
}) {
  const prize = category.type === "PRIZE";
  const ribbon = Array.from({ length: 6 }, () => category.name).join("  ✦  ");
  const count = revealed ? category.finalists.length : slots;
  return (
    <section id={`categoria-${category.num}`} className={cn("nx-chapter relative border-t border-line", prize ? "accent-prize" : "accent-honor")}>
      {/* Cinta con el nombre de la categoría, se desliza con el scroll */}
      <div aria-hidden="true" className="overflow-hidden border-b border-line py-4 whitespace-nowrap lg:py-6">
        <span className="nx-marquee inline-block font-display text-[34px] font-extrabold tracking-[-0.03em] text-transparent uppercase [-webkit-text-stroke:1.5px_var(--line-strong)] lg:text-[64px]">
          {ribbon}
        </span>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(250px,30%)_minmax(0,1fr)] lg:gap-16 lg:px-16 lg:py-24">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-8">
          <span className="self-start bg-(--accent) px-2.5 py-1.5 text-xs font-bold tracking-[0.22em] uppercase chamfer-6">
            {TYPE_LABEL[category.type]}
          </span>
          <span aria-hidden="true" className="nx-num font-display text-[clamp(120px,15vw,230px)] leading-[0.8] font-black tracking-[-0.07em]">
            {category.num}
          </span>
          <p className="text-[17px] leading-relaxed text-ink-soft lg:text-[19px]">{category.description}</p>
          <div className="h-0.5 bg-line">
            <div className="nx-progress h-0.5 bg-(--accent)" />
          </div>
          {/* Índice: atajo a cada categoría */}
          <nav aria-label="Categorías" className="mt-3 hidden flex-col lg:flex">
            {all.map((other, i) => {
              const current = i === index;
              return (
                <a
                  key={other.id}
                  href={`#categoria-${other.num}`}
                  aria-current={current ? "true" : undefined}
                  className={cn("flex min-h-10 items-center gap-3 text-[15px] transition-colors hover:text-ink", current ? "font-bold text-ink" : "text-ink-soft")}
                >
                  <span aria-hidden="true" className={cn("size-2.5 shrink-0 rotate-45 border-[1.5px]", current ? "border-(--accent) bg-(--accent)" : "border-line-strong")} />
                  <span className="w-6 font-display text-xs font-bold">{other.num}</span>
                  <span>{other.name}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        <div>
          <p className="text-xs font-bold tracking-[0.24em] text-ink-soft uppercase">
            Categoría {category.num} de {String(all.length).padStart(2, "0")}
            {revealed && ` · ${count} ${count === 1 ? "nominado" : "nominados"}`}
          </p>
          <h2 className="nx-reveal mt-4 font-display text-[clamp(40px,6.2vw,92px)] leading-[0.98] font-extrabold tracking-[-0.04em]">
            {category.name}
          </h2>

          <ul className="mt-10 grid grid-cols-2 gap-x-3.5 gap-y-8 lg:mt-16 lg:gap-x-9 lg:gap-y-12">
            {revealed
              ? category.finalists.map((f, i) => (
                  <li key={f.id} className={cn("nx-card", i % 2 === 1 && "mt-11 lg:mt-24")}>
                    <FinalistCard finalist={f} number={i + 1} />
                  </li>
                ))
              : Array.from({ length: slots }, (_, i) => (
                  <li key={i} className={cn("nx-card", i % 2 === 1 && "mt-11 lg:mt-24")}>
                    <div className="card-facedown grid aspect-[4/5] place-items-center border border-line chamfer-14">
                      <span aria-hidden="true" className="font-display text-5xl font-black text-(--accent) lg:text-7xl">
                        ?
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">{revealNote}</p>
                  </li>
                ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalistCard({ finalist, number }: { finalist: BoardFinalist; number: number }) {
  return (
    <article>
      <div className="relative aspect-[4/5] bg-(--accent) p-px chamfer-14 lg:chamfer-22">
        <div className="relative size-full overflow-hidden [clip-path:inherit]">
          {finalist.photoUrl ? (
            <div className="photo-duotone size-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL */}
              <img src={finalist.photoUrl} alt={`Foto de ${finalist.name}`} className="size-full object-cover" />
            </div>
          ) : (
            <span className="grid size-full place-items-center bg-sand font-display text-[clamp(28px,5vw,64px)] font-extrabold text-(--accent)">
              {initials(finalist.name)}
            </span>
          )}
          <span className="absolute top-2.5 left-3 bg-black px-2 py-1 font-display text-[10px] font-bold tracking-[0.14em] text-white lg:top-4 lg:left-5 lg:text-xs">
            Nº {String(number).padStart(2, "0")}
          </span>
        </div>
      </div>
      <h3 className="mt-3 font-display text-base leading-tight font-bold tracking-[-0.02em] lg:mt-5 lg:text-[27px]">{finalist.name}</h3>
      {finalist.nickname && <p className="mt-1 text-sm text-(--accent) italic lg:text-[15px]">«{finalist.nickname}»</p>}
      {finalist.external && !finalist.nickname && <p className="mt-1 text-sm text-ink-soft italic">De fuera del grupo</p>}
    </article>
  );
}
