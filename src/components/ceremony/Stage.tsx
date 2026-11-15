import { LogoMark } from "@/components/ui/Logo";
import type { CategoryType } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";
import { CUP, CUP_PLAQUE, LAUREL, type TrophyTone } from "./trophyShapes";

// Piezas de la pantalla de la premiación (16:9, noche). Las usa la ceremonia
// real y el demo, para que el ganador se vea exactamente igual en los dos.
// Todo escala con el ancho del contenedor (@container + cqw).

export interface StageFinalist {
  id: string;
  name: string;
  photoUrl: string | null;
  blurb: string | null;
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

/** Foto enmarcada en el color de la categoría, en duotono (o iniciales). */
export function Portrait({ finalist, className, dim }: { finalist: StageFinalist; className?: string; dim?: boolean }) {
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

/** Barra de arriba de cada categoría: evento, número y progreso. */
export function CategoryTopBar({
  eventName,
  categories,
  index,
}: {
  eventName: string;
  categories: StageCategory[];
  index: number;
}) {
  const category = categories[index]!;
  return (
    <div className="absolute inset-x-[4.4cqw] top-[2.7cqw] z-10 flex items-center justify-between font-display text-[1cqw] font-semibold tracking-[0.16em] uppercase">
      <span className="inline-flex items-center gap-[0.8cqw]">
        <LogoMark className="h-[1.9cqw] w-[1.7cqw] text-copper" />
        {eventName}
      </span>
      <span className="inline-flex items-center gap-[1.1cqw] text-(--accent)">
        Categoría {pad(index + 1)} / {pad(categories.length)} · {TYPE_LABEL[category.type]}
        <span className="flex gap-[0.25cqw]" aria-hidden="true">
          {categories.map((c, i) => (
            <span key={c.id} className={cn("h-[0.25cqw] w-[0.65cqw]", i < index ? "bg-ink" : i === index ? "bg-(--accent)" : "bg-line")} />
          ))}
        </span>
      </span>
    </div>
  );
}

/** Tipo y nombre de la categoría, centrados. */
export function StageHeading({ category }: { category: StageCategory }) {
  return (
    <div className="space-y-[1cqw] text-center">
      <p className="font-display text-[1.4cqw] font-semibold tracking-[0.3em] text-(--accent) uppercase">{TYPE_LABEL[category.type]}</p>
      <h1 className="font-display text-[5.5cqw] leading-[1.02] font-extrabold">{category.name}</h1>
    </div>
  );
}

/**
 * La revelación: el ganador (o los ganadores, si empatan) al centro con el
 * trofeo, y la fila de nominados abajo con los puestos 2.º a 4.º. Nunca
 * conteos; quien tuvo 0 votos queda como «Finalista», sin puesto (regla 8).
 */
export function WinnerView({
  category,
  winnerIds,
  winnerPercent,
  showWinnerPercent,
  places = {},
  year,
}: {
  category: StageCategory;
  winnerIds: string[];
  winnerPercent: number | null;
  showWinnerPercent: boolean;
  /** Puesto (2 a 4) de los demás finalistas; los que no están no tienen puesto. */
  places?: Record<string, number>;
  /** Año grabado en el trofeo (se pasa desde afuera: aquí no se lee la hora). */
  year: string;
}) {
  const winners = category.finalists.filter((f) => winnerIds.includes(f.id));
  // Fila de abajo: ganadores, luego por puesto, y al final los que no tienen puesto
  // (en el orden de la categoría). `sort` es estable, así que los empates no se mueven.
  const rank = (id: string) => (winnerIds.includes(id) ? 1 : (places[id] ?? Infinity));
  const row = [...category.finalists].sort((a, b) => rank(a.id) - rank(b.id));
  if (winners.length === 0) {
    return (
      <div className="ceremony-rise relative z-10 space-y-[2cqw] text-center">
        <StageHeading category={category} />
        <p className="text-[2.6cqw] text-ink-soft">Categoría desierta: no hubo votos para ningún finalista.</p>
      </div>
    );
  }
  const tie = winners.length > 1;
  return (
    <>
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
          {showWinnerPercent && winnerPercent != null && (
            <span className="mt-[0.4cqw] inline-flex items-baseline gap-[0.6cqw] border-t border-ink/20 pt-[0.8cqw] text-[1.2cqw] text-ink-faint">
              <span className="font-display text-[2cqw] font-bold text-(--accent)">≈ {winnerPercent} %</span>
              {tie ? "de los votos cada uno" : "de los votos"}
            </span>
          )}
        </div>
        <Trophy type={category.type} year={year} className="h-[26cqw] w-[20cqw] shrink-0 max-[600px]:hidden" />
      </div>
      {/* Fila de nominados */}
      <div className="absolute inset-x-[4.4cqw] bottom-[2cqw] z-10 flex items-center gap-[1.9cqw] [--frame-chamfer:0.55cqw]">
        <span className="text-[0.95cqw] font-bold tracking-[0.16em] text-ink-faint uppercase">Nominados</span>
        {row.map((f) => {
          const won = winners.includes(f);
          const place = places[f.id];
          return (
            <span key={f.id} className={cn("flex items-center gap-[0.9cqw]", !won && !place && "opacity-55")}>
              {place && <span className="font-display text-[1.7cqw] font-extrabold text-(--accent)">{place}º</span>}
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
