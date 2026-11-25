"use client";

import type { Nominee } from "@/lib/ballots/nomination";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";

export interface NominationOption {
  id: string;
  label: string;
  photoUrl: string | null;
  blurb: string | null;
}

/**
 * Para las categorías con opciones del organizador (profes, eventos, frases):
 * tarjetas para tocar, con foto si la hay. Se marcan hasta el máximo.
 */
export function OptionGrid({
  options,
  picked,
  maxPicks,
  accent,
  onChange,
}: {
  options: NominationOption[];
  picked: Nominee[];
  maxPicks: number;
  accent: "copper" | "sage";
  onChange: (list: Nominee[]) => void;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-ink-soft">El organizador todavía no carga las opciones de esta categoría.</p>;
  }
  const chosen = new Set(picked.flatMap((n) => (n.type === "option" ? [n.id] : [])));
  const full = chosen.size >= maxPicks;

  function toggle(id: string) {
    if (chosen.has(id)) onChange(picked.filter((n) => !(n.type === "option" && n.id === id)));
    else if (maxPicks === 1) onChange([{ type: "option", id }]); // con una sola, tocar otra la cambia
    else if (!full) onChange([...picked, { type: "option", id }]);
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {options.map((option) => {
        const on = chosen.has(option.id);
        const blocked = !on && full && maxPicks > 1;
        return (
          <li key={option.id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={blocked}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex h-full w-full flex-col gap-2 border p-2 text-left transition-colors chamfer-10 disabled:opacity-45",
                on ? "border-ink bg-raised shadow-[inset_0_0_0_2px_var(--ink)]" : "border-line bg-sheet hover:bg-raised",
              )}
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-sand chamfer-8">
                {option.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto pequeña guardada como data URL
                  <img src={option.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center font-display text-2xl font-extrabold text-ink/70">
                    {initials(option.label)}
                  </span>
                )}
                {on && (
                  <span
                    aria-hidden="true"
                    className={cn("absolute top-1.5 right-1.5 grid size-7 place-items-center chamfer-5", accent === "copper" ? "bg-copper" : "bg-sage")}
                  >
                    <svg viewBox="0 0 16 16" className="size-4" fill="none">
                      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </span>
              <span className="block text-[15px] leading-snug font-semibold">{option.label}</span>
              {option.blurb && <span className="block text-xs leading-snug text-ink-soft">{option.blurb}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
