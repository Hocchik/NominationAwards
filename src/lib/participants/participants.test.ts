import { describe, expect, it } from "vitest";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS, afterFailedAttempt, isLocked, minutesLeft } from "./lockout";
import { cleanDisplayName, normalizeName } from "./names";
import { displayNameSchema, newPinSchema, pinSchema } from "./schemas";

describe("nombres", () => {
  it("no distingue mayúsculas, tildes ni espacios de más", () => {
    expect(normalizeName("  José   Pérez ")).toBe("jose perez");
    expect(normalizeName("JOSÉ PÉREZ")).toBe(normalizeName("jose perez"));
    expect(normalizeName("Agüero")).toBe("aguero");
  });

  it("conserva la ñ: Peña y Pena son personas distintas", () => {
    expect(normalizeName("Peña")).toBe("peña");
    expect(normalizeName("PEÑA")).toBe("peña");
    expect(normalizeName("Peña")).not.toBe(normalizeName("Pena"));
  });

  it("Juan y Juancho siguen siendo distintos (eso lo decide el admin)", () => {
    expect(normalizeName("Juan")).not.toBe(normalizeName("Juancho"));
  });

  it("el nombre que se muestra queda limpio pero con sus tildes", () => {
    expect(cleanDisplayName("  María   José ")).toBe("María José");
  });

  it("valida el largo del nombre ya limpio", () => {
    expect(displayNameSchema.safeParse("  A  ").success).toBe(false);
    expect(displayNameSchema.parse("  Ana  ")).toBe("Ana");
  });
});

describe("PIN", () => {
  it("acepta de 4 a 6 números y nada más", () => {
    for (const ok of ["1234", "12345", "123456"]) expect(pinSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["123", "1234567", "12a4", " 1234", ""]) {
      expect(pinSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("pide que los dos PIN coincidan", () => {
    expect(newPinSchema.safeParse({ pin: "1234", pinConfirm: "1234" }).success).toBe(true);
    const mismatch = newPinSchema.safeParse({ pin: "1234", pinConfirm: "4321" });
    expect(mismatch.success).toBe(false);
  });
});

describe("bloqueo por intentos fallidos", () => {
  const now = new Date("2026-11-20T20:00:00Z");

  it(`bloquea al intento ${MAX_FAILED_ATTEMPTS} por ${LOCK_MINUTES} minutos`, () => {
    let state: { failedAttempts: number; lockedUntil: Date | null } = { failedAttempts: 0, lockedUntil: null };
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      state = afterFailedAttempt(state.failedAttempts, now);
      expect(state.lockedUntil).toBeNull();
      expect(state.failedAttempts).toBe(i);
    }
    state = afterFailedAttempt(state.failedAttempts, now);
    expect(state.failedAttempts).toBe(0);
    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_MINUTES * 60_000);
  });

  it("el bloqueo vence solo", () => {
    const until = new Date(now.getTime() + 15 * 60_000);
    expect(isLocked(until, now)).toBe(true);
    expect(isLocked(until, new Date(until.getTime() + 1))).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it("informa los minutos que faltan, redondeando hacia arriba", () => {
    expect(minutesLeft(new Date(now.getTime() + 61_000), now)).toBe(2);
    expect(minutesLeft(new Date(now.getTime() + 1_000), now)).toBe(1);
  });
});
