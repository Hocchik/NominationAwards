"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

// Botón para cambiar entre el tema claro («Oro y carmín») y el oscuro («Gala
// nocturna»). La elección se guarda solo en este dispositivo (localStorage);
// si la persona nunca eligió, manda la preferencia de su sistema. El script de
// layout.tsx aplica el tema antes de pintar, así no hay parpadeo al cargar.

export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "tema";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Todos los botones de la página miran el mismo atributo de <html>: si uno
// cambia el tema, los demás se enteran y muestran el ícono correcto.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Cuánto dura el cambio de tema (globals.css usa el mismo valor). */
const FADE_MS = 700;

/**
 * Cambia el tema poco a poco, no de golpe: pasar de claro a oscuro de un
 * instante a otro encandila. Con View Transitions la página entera se funde;
 * sin ellas, los colores pasan con una transición CSS mientras dure el cambio.
 */
function applyThemeGently(next: Theme) {
  const root = document.documentElement;
  const paint = () => {
    root.dataset.theme = next;
  };
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(paint);
    return;
  }
  root.classList.add("theme-fading");
  paint();
  window.setTimeout(() => root.classList.remove("theme-fading"), FADE_MS);
}

export function ThemeToggle({ className }: { className?: string }) {
  // null en el servidor: allí no se sabe qué tema eligió la persona.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    applyThemeGently(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado): igual cambia en esta visita.
    }
  }

  const dark = theme === "dark";
  const label = dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 border-[1.5px] border-line-strong px-3 text-sm font-semibold text-ink transition-colors hover:border-ink chamfer-6",
        className,
      )}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
      <span className="max-sm:sr-only">{dark ? "Claro" : "Oscuro"}</span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
      <path d="M13.6 14.6A6.8 6.8 0 0 1 7.3 3.1a7.2 7.2 0 1 0 9.6 9.6 6.8 6.8 0 0 1-3.3 1.9Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
      <circle cx="10" cy="10" r="3.6" />
      <path d="M10 1.5v2.6M10 15.9v2.6M1.5 10h2.6M15.9 10h2.6M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
