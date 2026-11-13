import { describe, expect, it } from "vitest";
import { padPayload } from "@/lib/crypto/padding";
import { scheduledPhase } from "@/lib/event/schedule";
import { buildVoteBallot, validateVotes, voteBallotBytes, voteBallotSchema } from "./vote";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("papeleta de voto", () => {
  const categories = [
    { id: uuid(1), finalistIds: [uuid(11), uuid(12)] },
    { id: uuid(2), finalistIds: [uuid(21), uuid(22)] },
  ];

  it("pide una opción en cada categoría", () => {
    expect(Object.keys(validateVotes({ [uuid(1)]: uuid(11) }, categories, true))).toEqual([uuid(2)]);
  });

  it("acepta «Me abstengo» solo si el evento lo permite", () => {
    const votes = { [uuid(1)]: uuid(11), [uuid(2)]: null };
    expect(validateVotes(votes, categories, true)).toEqual({});
    expect(Object.keys(validateVotes(votes, categories, false))).toEqual([uuid(2)]);
  });

  it("rechaza un finalista que no es de esa categoría", () => {
    const votes = { [uuid(1)]: uuid(21), [uuid(2)]: uuid(21) };
    expect(Object.keys(validateVotes(votes, categories, true))).toEqual([uuid(1)]);
  });

  it("la papeleta trae todas las categorías activas y se puede volver a leer", () => {
    const ballot = buildVoteBallot({ [uuid(1)]: uuid(12) }, [uuid(1), uuid(2)]);
    expect(ballot.votes).toEqual({ [uuid(1)]: uuid(12), [uuid(2)]: null });
    expect(voteBallotSchema.parse(JSON.parse(JSON.stringify(ballot)))).toEqual(ballot);
  });

  it("el tamaño fijo alcanza para todas las categorías con voto", () => {
    for (const count of [1, 11, 12, 15, 30]) {
      const ids = Array.from({ length: count }, (_, i) => uuid(100 + i));
      const ballot = buildVoteBallot(Object.fromEntries(ids.map((id) => [id, uuid(900)])), ids);
      expect(() => padPayload({ ...ballot }, voteBallotBytes(count))).not.toThrow();
    }
    expect(voteBallotBytes(5)).toBe(1024);
  });
});

describe("horario de la votación", () => {
  const opens = new Date("2026-11-22T23:00:00Z");
  const closes = new Date("2026-11-23T07:00:00Z");
  const base = { nominationsCloseAt: null, votingOpensAt: opens, votingClosesAt: closes, readyToOpen: true };

  it("abre sola a la hora programada", () => {
    expect(scheduledPhase({ ...base, phase: "FINALISTS_READY", now: new Date("2026-11-22T22:59:59Z") })).toBeNull();
    expect(scheduledPhase({ ...base, phase: "FINALISTS_READY", now: opens })).toBe("VOTING");
  });

  it("no abre si no hay categorías activas o llave", () => {
    expect(scheduledPhase({ ...base, readyToOpen: false, phase: "FINALISTS_READY", now: opens })).toBeNull();
  });

  it("cierra sola a la hora programada", () => {
    expect(scheduledPhase({ ...base, phase: "VOTING", now: new Date("2026-11-23T06:59:59Z") })).toBeNull();
    expect(scheduledPhase({ ...base, phase: "VOTING", now: closes })).toBe("VOTING_CLOSED");
  });

  it("si nadie entró durante la votación, pasa directo a cerrada", () => {
    expect(scheduledPhase({ ...base, phase: "FINALISTS_READY", now: new Date("2026-11-24T00:00:00Z") })).toBe("VOTING_CLOSED");
  });

  it("no toca otras fases ni eventos sin horario", () => {
    expect(scheduledPhase({ ...base, phase: "NOMINATIONS", now: closes })).toBeNull();
    expect(scheduledPhase({ ...base, phase: "VOTING", now: closes, votingOpensAt: null, votingClosesAt: null })).toBeNull();
  });
});
