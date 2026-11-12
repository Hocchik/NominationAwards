import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Hoja «Día y noche» (CLAUDE.md §9): panel --sheet con filo --line y chaflán.
// El filo fino con chaflán se logra con dos capas: el elemento pinta la línea
// y su ::before, 1px más adentro y con su propio chaflán, pinta la hoja. Así
// la tarjeta sigue siendo un solo elemento y las clases de layout aplican igual.

/** prize = categoría de premio (cobre) · honor = honorífica (salvia) */
type CardAccent = "none" | "prize" | "honor";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  accent?: CardAccent;
  as?: "div" | "section" | "article" | "li";
  /** Tamaño del chaflán: sm en tarjetas chicas o listas. */
  size?: "sm" | "md";
}

const accents: Record<CardAccent, string> = {
  none: "",
  prize: "accent-prize",
  honor: "accent-honor",
};

export function Card({ accent = "none", as: Tag = "div", size = "md", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "relative isolate bg-line p-5 sm:p-6",
        "before:absolute before:inset-px before:-z-10 before:bg-sheet",
        size === "md" ? "chamfer-18 before:chamfer-17" : "chamfer-10 before:chamfer-9",
        accents[accent],
        className,
      )}
      {...props}
    />
  );
}
