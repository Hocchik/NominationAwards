import { describe, expect, it } from "vitest";
import { type PhaseContext, getAdvanceBlockers } from "./phases";

const now = new Date(Date.UTC(2026, 10, 20, 12));
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3_600_000);

/** Un evento listo para avanzar en cualquier fase; cada test rompe una cosa. */
const ready: PhaseContext = {
  phase: "SETUP",
  categoryCount: 5,
  activePrizeCount: 3,
  activeHonoraryCount: 2,
  maxPrizeCategories: 15,
  hasNominationKey: true,
  hasVoteKey: true,
  nominationsCloseAt: hoursFromNow(24),
  votingOpensAt: hoursFromNow(48),
  votingClosesAt: hoursFromNow(72),
  now,
};

describe("abrir la sala (Preparación → Nominaciones)", () => {
  it("con categorías, llaves y horario futuro, se puede avanzar", () => {
    expect(getAdvanceBlockers(ready)).toEqual([]);
    expect(getAdvanceBlockers({ ...ready, nominationsCloseAt: null })).toEqual([]);
  });

  it("pide al menos una categoría", () => {
    expect(getAdvanceBlockers({ ...ready, categoryCount: 0 })).toEqual(["Crea al menos una categoría."]);
  });

  it("pide las dos llaves del notario", () => {
    expect(getAdvanceBlockers({ ...ready, hasNominationKey: false })).toHaveLength(1);
    expect(getAdvanceBlockers({ ...ready, hasVoteKey: false })).toHaveLength(1);
  });

  it("no deja abrir con una hora de cierre que ya pasó", () => {
    expect(getAdvanceBlockers({ ...ready, nominationsCloseAt: hoursFromNow(-1) })[0]).toMatch(/ya pasó/);
    expect(getAdvanceBlockers({ ...ready, nominationsCloseAt: now })).toHaveLength(1);
  });

  it("junta todos los problemas a la vez", () => {
    expect(getAdvanceBlockers({ ...ready, categoryCount: 0, hasVoteKey: false })).toHaveLength(2);
  });
});

describe("abrir la votación (Finalistas listos → Votación)", () => {
  const finalists = { ...ready, phase: "FINALISTS_READY" as const };

  it("con categorías activas, llave y cierre futuro, se puede avanzar", () => {
    expect(getAdvanceBlockers(finalists)).toEqual([]);
    expect(getAdvanceBlockers({ ...finalists, activePrizeCount: 0 })).toEqual([]); // solo honoríficas
  });

  it("pide al menos una categoría activa", () => {
    expect(getAdvanceBlockers({ ...finalists, activePrizeCount: 0, activeHonoraryCount: 0 })).toEqual([
      "Activa al menos una categoría en Finalistas.",
    ]);
  });

  it("respeta el tope de categorías de premio", () => {
    expect(getAdvanceBlockers({ ...finalists, activePrizeCount: 16 })[0]).toMatch(/16 .* máximo es 15/);
    expect(getAdvanceBlockers({ ...finalists, activePrizeCount: 15 })).toEqual([]);
  });

  it("pide la llave de votación y un cierre que no haya pasado", () => {
    expect(getAdvanceBlockers({ ...finalists, hasVoteKey: false })).toHaveLength(1);
    expect(getAdvanceBlockers({ ...finalists, votingClosesAt: hoursFromNow(-2) })).toHaveLength(1);
    expect(getAdvanceBlockers({ ...finalists, votingClosesAt: null })).toEqual([]);
  });

  it("ya no exige nada de las nominaciones", () => {
    expect(getAdvanceBlockers({ ...finalists, nominationsCloseAt: hoursFromNow(-30), hasNominationKey: false })).toEqual([]);
  });
});

describe("los demás pasos son decisión del admin", () => {
  it.each(["NOMINATIONS", "VOTING", "VOTING_CLOSED", "CEREMONY"] as const)("%s no tiene requisitos", (phase) => {
    expect(
      getAdvanceBlockers({ ...ready, phase, categoryCount: 0, activePrizeCount: 0, activeHonoraryCount: 0, hasVoteKey: false }),
    ).toEqual([]);
  });
});
