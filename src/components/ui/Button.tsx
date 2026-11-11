import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide " +
  "select-none transition-[background-color,box-shadow,color,transform] duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-background hover:bg-gold-soft " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-10px_rgb(212_175_55/0.7)] " +
    "hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_12px_36px_-8px_rgb(212_175_55/0.85)]",
  secondary: "glass text-foreground hover:bg-surface-strong",
  ghost: "text-gold hover:bg-gold/10",
  danger: "border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25",
};

// Mínimo 48px de alto (CLAUDE.md §9): cómodo para el dedo en el celular.
const sizes: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      // type="button" por defecto: dentro de un <form> evita envíos accidentales
      // (el valor por defecto del navegador es "submit").
      type={type}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
