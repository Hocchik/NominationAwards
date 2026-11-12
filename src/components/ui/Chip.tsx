import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Etiquetas «Día y noche» (CLAUDE.md §9). Sobre claro, el cobre y la salvia
// nunca son texto chico: van de relleno con texto tinta encima.

type ChipTone = "copper" | "sage" | "neutral";
type ChipSize = "sm" | "md";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  /** sm = etiqueta informativa (no táctil) · md = chip seleccionable/quitable */
  size?: ChipSize;
  /** Si se pasa, el chip muestra una ✕ para quitarlo. */
  onRemove?: () => void;
  /** Texto para lectores de pantalla en el botón de quitar. */
  removeLabel?: string;
  className?: string;
}

const tagTones: Record<ChipTone, string> = {
  copper: "bg-copper text-ink",
  sage: "bg-sage text-ink",
  neutral: "bg-sand text-ink",
};

export function Chip({ children, tone = "copper", size = "md", onRemove, removeLabel, className }: ChipProps) {
  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center px-2 py-1 font-display text-[10px] leading-none font-bold tracking-[0.14em] uppercase",
          tagTones[tone],
          className,
        )}
      >
        <span className="truncate">{children}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "relative isolate inline-flex min-h-11 max-w-full items-center gap-2 bg-line text-[15px] font-semibold text-ink",
        "chamfer-8 before:absolute before:inset-px before:-z-10 before:bg-raised before:chamfer-7",
        onRemove ? "pr-1 pl-3" : "px-3",
        className,
      )}
    >
      {tone !== "neutral" && (
        <span aria-hidden="true" className={cn("size-2 shrink-0", tone === "copper" ? "bg-copper" : "bg-sage")} />
      )}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Quitar"}
          className="grid size-10 shrink-0 place-items-center transition-colors hover:bg-ink/5"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
