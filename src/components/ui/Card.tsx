import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** prize = categoría de premio (dorado) · honor = honorífica (lavanda) */
type CardAccent = "none" | "prize" | "honor";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  accent?: CardAccent;
  as?: "div" | "section" | "article" | "li";
}

const accents: Record<CardAccent, string> = {
  none: "",
  prize:
    "border-gold/35 shadow-[0_0_48px_-16px_rgb(212_175_55/0.45)] " +
    "before:bg-linear-to-r before:from-transparent before:via-gold before:to-transparent",
  honor:
    "border-honor/30 shadow-[0_0_48px_-16px_rgb(184_181_255/0.4)] " +
    "before:bg-linear-to-r before:from-transparent before:via-honor before:to-transparent",
};

export function Card({ accent = "none", as: Tag = "div", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "glass relative rounded-card p-5 sm:p-6",
        // Filo de luz en el borde superior (solo visible con acento)
        "before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px",
        accents[accent],
        className,
      )}
      {...props}
    />
  );
}
