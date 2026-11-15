import { describe, expect, it } from "vitest";
import { boardCountdown, boardState, homeView, voteButton } from "./nominees";

const day = (d: number) => new Date(Date.UTC(2026, 10, d, 20));

describe("estado de la página de nominados", () => {
  it("no muestra nada antes de abrir la sala", () => {
    expect(boardState("SETUP", 0)).toBe("closed");
  });

  it("muestra cartas boca abajo mientras no haya finalistas", () => {
    expect(boardState("NOMINATIONS", 0)).toBe("waiting");
    expect(boardState("NOMINATIONS_CLOSED", 0)).toBe("waiting");
  });

  it("solo revela cuando el admin activa alguna categoría", () => {
    expect(boardState("FINALISTS_READY", 0)).toBe("waiting");
    expect(boardState("FINALISTS_READY", 3)).toBe("revealed");
    expect(boardState("VOTING", 3)).toBe("revealed");
    expect(boardState("FINISHED", 3)).toBe("revealed");
  });
});

describe("cuenta regresiva", () => {
  const times = { nominationsCloseAt: day(20), votingOpensAt: day(21), votingClosesAt: day(22) };

  it("apunta a la próxima hora programada según la fase", () => {
    expect(boardCountdown({ phase: "NOMINATIONS", ...times })?.target).toEqual(day(20));
    expect(boardCountdown({ phase: "FINALISTS_READY", ...times })?.target).toEqual(day(21));
    expect(boardCountdown({ phase: "VOTING", ...times })?.target).toEqual(day(22));
  });

  it("no hay cuenta regresiva sin horario ni en fases que dependen de una persona", () => {
    expect(boardCountdown({ phase: "NOMINATIONS", ...times, nominationsCloseAt: null })).toBeNull();
    expect(boardCountdown({ phase: "NOMINATIONS_CLOSED", ...times })).toBeNull();
    expect(boardCountdown({ phase: "CEREMONY", ...times })).toBeNull();
  });
});

describe("página principal", () => {
  it("mientras se nomina solo se nomina; después, siempre Nominados", () => {
    expect(homeView("SETUP")).toBe("closed");
    expect(homeView("NOMINATIONS")).toBe("nominate");
    for (const phase of ["NOMINATIONS_CLOSED", "FINALISTS_READY", "VOTING", "VOTING_CLOSED", "CEREMONY", "FINISHED"] as const) {
      expect(homeView(phase)).toBe("nominees");
    }
  });
});

describe("botón Votar de Nominados", () => {
  const fresh = { hasVoted: false };

  it("no aparece mientras se nomina", () => {
    expect(voteButton("SETUP", null)).toBeNull();
    expect(voteButton("NOMINATIONS", fresh)).toBeNull();
  });

  it("se ve pero no se puede tocar hasta la hora de abrir", () => {
    expect(voteButton("NOMINATIONS_CLOSED", null)).toEqual({ state: "soon" });
    expect(voteButton("FINALISTS_READY", fresh)).toEqual({ state: "soon" });
  });

  it("abierta: pide tocar tu nombre si no entraste, y una sola vez", () => {
    expect(voteButton("VOTING", null)).toEqual({ state: "open", needsEntry: true });
    expect(voteButton("VOTING", fresh)).toEqual({ state: "open", needsEntry: false });
    expect(voteButton("VOTING", { hasVoted: true })).toEqual({ state: "done" });
  });

  it("después de la votación queda cerrada (la ceremonia no se muestra)", () => {
    expect(voteButton("VOTING_CLOSED", fresh)).toEqual({ state: "closed" });
    expect(voteButton("CEREMONY", null)).toEqual({ state: "closed" });
    expect(voteButton("FINISHED", fresh)).toEqual({ state: "closed" });
  });
});
