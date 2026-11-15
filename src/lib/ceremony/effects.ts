import confetti from "canvas-confetti";

// Efectos de la ceremonia (CLAUDE.md §8). Sin sonido: se quitó el 2026-11-14
// porque molestaba; la revelación se apoya solo en la animación y el confeti.

/** Lee un color del sistema de diseño (globals.css), con un respaldo por si falta. */
function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Confeti desde los dos costados, en los colores de la paleta. Se apaga si la persona pidió menos movimiento. */
export function celebrate(kind: "prize" | "honor"): void {
  const prize = token("--copper", "#d9783f");
  const honor = token("--sage", "#5e9488");
  const sheet = token("--sheet", "#f8f4ec");
  // El color de la categoría manda; el otro acento y la hoja acompañan.
  const colors = kind === "prize" ? [prize, prize, honor, sheet] : [honor, honor, prize, sheet];
  const shared = { particleCount: 120, spread: 70, startVelocity: 55, colors, disableForReducedMotion: true };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.75 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.75 } });
}
