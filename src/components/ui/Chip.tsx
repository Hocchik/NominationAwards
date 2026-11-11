import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipTone = "gold" | "honor" | "neutral";
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

const tones: Record<ChipTone, string> = {
  gold: "border-gold/45 bg-gold/12 text-gold-soft",
  honor: "border-honor/40 bg-honor/12 text-honor",
  neutral: "border-line bg-surface text-foreground",
};

export function Chip({
  children,
  tone = "gold",
  size = "md",
  onRemove,
  removeLabel,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "min-h-6 px-2.5 text-xs" : "min-h-10 text-sm",
        size === "md" && (onRemove ? "pr-1 pl-4" : "px-4"),
        tones[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Quitar"}
          className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
