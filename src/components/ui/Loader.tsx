import { cn } from "@/lib/cn";

/**
 * Pantalla de carga entre pantallas importantes (sala, papeletas, panel): la
 * marca del trofeo que se arma con un brillo suave y un texto corto. No se usa
 * dentro de las animaciones de la ceremonia. Con «reducir movimiento» queda quieta.
 */
export function Loader({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("grid min-h-[60svh] flex-1 place-items-center px-4 py-16", className)}>
      <div className="flex flex-col items-center gap-5">
        {/* viewBox con aire arriba: el rombo sube al «respirar» y no debe recortarse */}
        <svg viewBox="0 -4 18 24" aria-hidden="true" className="loader-mark h-16 w-12 text-copper" fill="currentColor">
          <path className="loader-gem" d="M9 0l3 3-3 3-3-3z" />
          <path className="loader-cone" d="M6.5 7.5h5L18 20H0z" />
        </svg>
        <div className="loader-bar h-0.5 w-28 overflow-hidden bg-line" aria-hidden="true">
          <span className="block h-full w-1/3 bg-copper" />
        </div>
        <p className="max-w-xs text-center font-display text-xs leading-relaxed font-semibold tracking-[0.2em] text-ink-soft uppercase">{label}</p>
      </div>
    </div>
  );
}

/**
 * La misma carga, a pantalla completa y encima de todo: mientras se envía una
 * papeleta o se pasa de una pantalla a otra desde un botón.
 */
export function LoaderOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 backdrop-blur-sm">
      <Loader label={label} className="min-h-0" />
    </div>
  );
}
