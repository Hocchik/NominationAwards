import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Botones «Día y noche» (CLAUDE.md §9): primario cobre con texto tinta y
// chaflán; secundario transparente con borde de 1.5px en tinta.

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 select-none text-center " +
  "transition-[background-color,color,filter,transform] duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary:
    "chamfer-12 bg-copper font-display font-bold tracking-[0.06em] text-ink uppercase hover:brightness-105",
  secondary: "border-[1.5px] border-ink font-bold text-ink hover:bg-ink/5",
  ghost: "font-bold text-ink underline-offset-4 hover:bg-ink/5 hover:underline",
  danger: "border-[1.5px] border-danger font-bold text-danger hover:bg-danger/10",
};

// Mínimo 48px de alto (CLAUDE.md §9): cómodo para el dedo en el celular.
// El primario usa Unbounded en mayúsculas, que se ve más grande: va un punto más chico.
const sizes: Record<ButtonSize, Record<"display" | "text", string>> = {
  md: { display: "min-h-12 px-5 text-xs", text: "min-h-12 px-4 text-[15px]" },
  lg: { display: "min-h-14 px-6 text-[13px]", text: "min-h-14 px-5 text-base" },
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
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}

/** Las mismas clases del botón, para un <Link> que debe verse como botón. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "fullWidth" | "className"> = {}): string {
  return cn(
    base,
    variants[variant],
    sizes[size][variant === "primary" ? "display" : "text"],
    fullWidth && "w-full",
    className,
  );
}
