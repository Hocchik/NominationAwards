import { describe, expect, it } from "vitest";
import { type ScheduleInput, scheduledPhase } from "./schedule";

const at = (h: number) => new Date(Date.UTC(2026, 10, 20, h));
const base: ScheduleInput = {
  phase: "NOMINATIONS",
  now: at(12),
  nominationsCloseAt: at(18),
  votingOpensAt: at(20),
  votingClosesAt: at(22),
  readyToOpen: true,
};

// El horario de la votación se prueba en ballots/vote.test.ts.
describe("cierre de nominaciones por horario", () => {
  it("las nominaciones cierran solas a su hora, y no antes", () => {
    expect(scheduledPhase(base)).toBeNull();
    expect(scheduledPhase({ ...base, now: at(18) })).toBe("NOMINATIONS_CLOSED");
  });

  it("cerrar nominaciones no salta al notario aunque ya sea hora de votar", () => {
    expect(scheduledPhase({ ...base, now: at(23) })).toBe("NOMINATIONS_CLOSED");
  });

  it("sin hora de cierre, las nominaciones siguen abiertas", () => {
    expect(scheduledPhase({ ...base, now: at(23), nominationsCloseAt: null })).toBeNull();
  });
});
