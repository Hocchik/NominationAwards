"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

// Cuenta regresiva: un «pedacito de noche» en la web (CLAUDE.md §9), cifras
// en cobre sobre tinta. Se dibuja recién en el navegador: el servidor no sabe la hora de
// quien mira. Al llegar a cero recarga los datos de la página para que la fase
// avance por horario (lib/event/schedule.ts).

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const notYet = () => null;

const UNITS = [
  { label: "días", seconds: 86_400 },
  { label: "horas", seconds: 3_600 },
  { label: "min", seconds: 60 },
  { label: "seg", seconds: 1 },
] as const;

function split(totalSeconds: number): number[] {
  let rest = totalSeconds;
  return UNITS.map(({ seconds }) => {
    const value = Math.floor(rest / seconds);
    rest -= value * seconds;
    return value;
  });
}

function spoken([days, hours, minutes]: number[]): string {
  const part = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return `Faltan ${part(days!, "día", "días")}, ${part(hours!, "hora", "horas")} y ${part(minutes!, "minuto", "minutos")}`;
}

export function Countdown({ title, target, className }: { title: string; target: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, notYet);
  const router = useRouter();
  const end = Math.floor(new Date(target).getTime() / 1000);
  const left = now === null ? null : Math.max(0, end - now);
  const done = left === 0;

  useEffect(() => {
    if (!done) return;
    // Un respiro por si el reloj del dispositivo va un poco adelantado.
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [done, router]);

  const values = left === null ? null : split(left);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[11px] font-bold tracking-[0.16em] text-ink-soft uppercase">{title}</span>
      <div role="timer" aria-label={values ? spoken(values) : title} className="flex gap-1.5">
        {UNITS.map((unit, i) => (
          <span
            key={unit.label}
            className={cn(
              "theme-night flex w-14 flex-col items-center gap-0.5 bg-bg pt-2 pb-1.5 chamfer-7 sm:w-[4.75rem] sm:chamfer-9",
              unit.label === "seg" && "max-sm:hidden",
            )}
          >
            <span className="font-display text-lg leading-none font-bold text-copper tabular-nums sm:text-3xl">
              {values ? String(values[i]).padStart(2, "0") : "--"}
            </span>
            <span className="text-[9px] font-bold tracking-[0.12em] text-ink-soft uppercase sm:text-[10px]">{unit.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
