import { cn } from "@/lib/cn";
import { EVENT_NAME } from "@/lib/brand";
import { StatuetteMark } from "./Statuette";

/**
 * Marca (CLAUDE.md §9): la estatuilla de Premios del Grupo, sin rostro y con los
 * brazos cruzados en X. Toma el color del texto (currentColor); el tamaño se da
 * con el alto (`h-…`) y el ancho sale solo de su proporción.
 */
export function LogoMark({ className }: { className?: string }) {
  return <StatuetteMark className={className} />;
}

export function Logo({ className, name = EVENT_NAME }: { className?: string; name?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-xs font-semibold tracking-[0.14em] text-ink uppercase sm:text-[13px]",
        className,
      )}
    >
      <LogoMark className="h-9 text-copper" />
      {name}
    </span>
  );
}
