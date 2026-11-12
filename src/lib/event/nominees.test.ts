import { describe, expect, it } from "vitest";
import { boardCountdown, boardState, roomAction } from "./nominees";

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

describe("botón principal de la sala", () => {
  const approved = { status: "APPROVED" as const, hasNominated: false, hasVoted: false };

  it("invita a entrar a quien no tiene sesión mientras haya algo que hacer", () => {
    expect(roomAction("NOMINATIONS", null)).toBe("enter");
    expect(roomAction("VOTING", null)).toBe("enter");
    expect(roomAction("VOTING_CLOSED", null)).toBeNull();
    expect(roomAction("SETUP", null)).toBeNull();
  });

  it("lleva a nominar o votar solo si le toca", () => {
    expect(roomAction("NOMINATIONS", approved)).toBe("nominate");
    expect(roomAction("NOMINATIONS", { ...approved, hasNominated: true })).toBeNull();
    expect(roomAction("VOTING", approved)).toBe("vote");
    expect(roomAction("VOTING", { ...approved, hasVoted: true })).toBeNull();
    expect(roomAction("FINALISTS_READY", approved)).toBeNull();
  });

  it("un registro pendiente o rechazado no tiene botón", () => {
    expect(roomAction("NOMINATIONS", { ...approved, status: "PENDING" })).toBeNull();
    expect(roomAction("VOTING", { ...approved, status: "REJECTED" })).toBeNull();
  });
});
