import { cn } from "@/lib/cn";

/**
 * Fondo «Día y noche» (CLAUDE.md §9): haces de luz suaves en diagonal. De día
 * son blanco translúcido; dentro de .theme-night, luz de la hoja muy tenue.
 * Solo CSS (globals.css · .light-beams): se mueven muy lento y se quedan
 * quietos con prefers-reduced-motion. Es decorativo: aria-hidden.
 */
export function LightBeams({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("light-beams pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}
    />
  );
}
