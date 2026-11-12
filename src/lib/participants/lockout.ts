// Anti fuerza bruta del PIN (CLAUDE.md §5): tras 5 intentos fallidos, la
// cuenta se bloquea 15 minutos. Un PIN de 4 dígitos tiene 10 000 opciones:
// a 5 intentos cada 15 minutos, adivinarlo tomaría semanas.

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}

/** Minutos que faltan para desbloquear, redondeados hacia arriba (mínimo 1). */
export function minutesLeft(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}

/**
 * Nuevo estado tras un PIN incorrecto. Al llegar al máximo se bloquea y el
 * contador vuelve a cero, para que después del bloqueo haya otros 5 intentos.
 */
export function afterFailedAttempt(
  failedAttempts: number,
  now: Date,
): { failedAttempts: number; lockedUntil: Date | null } {
  const attempts = failedAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  }
  return { failedAttempts: attempts, lockedUntil: null };
}
