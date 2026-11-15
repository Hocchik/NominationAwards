import type { CategoryType } from "@/generated/prisma/enums";
import { CUP, CUP_PLAQUE, LAUREL, type TrophyTone } from "./trophyShapes";

// Piezas de la pantalla de la premiación (16:9, noche): el escenario de la
// portada y el cierre, y el trofeo. La revelación de cada categoría vive en
// Reveal.tsx, compartida por la ceremonia real y el demo.

export interface StageFinalist {
  id: string;
  name: string;
  photoUrl: string | null;
  /** Primer apodo, si es del grupo y tiene. */
  nickname: string | null;
  /** Referente de fuera del grupo. */
  external: boolean;
}

export interface StageCategory {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  finalists: StageFinalist[];
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const TYPE_LABEL = { PRIZE: "Premio", HONORARY: "Honorífica" } as const;

/** Escenario de noche: reflectores, piso en perspectiva y el número gigante al fondo. */
export function NightStage({ number }: { number: string | null }) {
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

const tone = (pct: number, mix: string) => `color-mix(in oklab, var(--accent) ${pct}%, ${mix})`;
const TROPHY_FILL: Record<TrophyTone, string> = {
  light: tone(60, "white"),
  accent: "var(--accent)",
  dark: tone(66, "black"),
  darker: tone(40, "black"),
  baseTop: "var(--line-strong)",
  base: "var(--sand)",
  baseSide: "var(--sheet)",
  shine: "white",
};

/**
 * Trofeo de la categoría (CLAUDE.md §9): copa facetada para las de premio y
 * laurel con estrella para las honoríficas, en los tonos del acento.
 */
export function Trophy({ type, year, className }: { type: CategoryType; year: string; className?: string }) {
  const cup = type === "PRIZE";
  return (
    <svg viewBox="0 0 200 260" role="img" aria-label={cup ? "Copa" : "Laurel"} className={className}>
      {(cup ? CUP : LAUREL).map((s, i) =>
        s.kind === "poly" ? (
          <polygon key={i} points={s.points} fill={TROPHY_FILL[s.tone]} />
        ) : (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={TROPHY_FILL[s.tone]} />
        ),
      )}
      {cup && (
        <text x={CUP_PLAQUE.x} y={CUP_PLAQUE.y} textAnchor="middle" fontFamily="var(--font-unbounded)" fontWeight="700" fontSize="9" letterSpacing="1.5" fill={TROPHY_FILL.light}>
          {year}
        </text>
      )}
    </svg>
  );
}
