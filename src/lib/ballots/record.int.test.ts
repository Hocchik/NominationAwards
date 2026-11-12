import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordBallot } from "./record";

// Test de integración contra la base real (CLAUDE.md §12): el envío atómico
// solo se puede comprobar de verdad con Postgres. Crea un evento temporal y lo
// borra al terminar. Se corre con `npm run test:db`.

const tag = `__test__${Date.now()}`;
let eventId = "";
const ids: Record<"approved" | "approved2" | "pending" | "rejected", string> = {
  approved: "",
  approved2: "",
  pending: "",
  rejected: "",
};

function send(participantId: string) {
  return recordBallot({
    eventId,
    participantId,
    phase: "NOMINATION",
    ciphertext: "QUJD",
    receiptCode: "ABC-DEF",
  });
}

beforeAll(async () => {
  const event = await prisma.event.create({
    data: { name: tag, roomCode: `T${Date.now().toString(36).toUpperCase()}`, phase: "NOMINATIONS" },
  });
  eventId = event.id;
  const make = (key: keyof typeof ids, status: "APPROVED" | "PENDING" | "REJECTED") =>
    prisma.participant
      .create({
        data: { eventId, displayName: `${tag}-${key}`, normalizedName: `${tag}-${key}`, pinHash: "x", status },
      })
      .then((p) => (ids[key] = p.id));
  await Promise.all([
    make("approved", "APPROVED"),
    make("approved2", "APPROVED"),
    make("pending", "PENDING"),
    make("rejected", "REJECTED"),
  ]);
});

afterAll(async () => {
  if (eventId) {
    await prisma.ballot.deleteMany({ where: { eventId } });
    await prisma.participant.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
  }
  await prisma.$disconnect();
});

describe("envío atómico de papeletas", () => {
  it("si el mismo participante envía varias veces a la vez, solo se guarda una", async () => {
    const results = await Promise.all([send(ids.approved), send(ids.approved), send(ids.approved)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "already-sent")).toHaveLength(2);
    expect(await prisma.ballot.count({ where: { eventId } })).toBe(1);
    const participant = await prisma.participant.findUniqueOrThrow({ where: { id: ids.approved } });
    expect(participant.hasNominated).toBe(true);
  });

  it("un participante PENDING o REJECTED no puede enviar", async () => {
    expect(await send(ids.pending)).toEqual({ ok: false, reason: "already-sent" });
    expect(await send(ids.rejected)).toEqual({ ok: false, reason: "already-sent" });
    expect(await prisma.ballot.count({ where: { eventId } })).toBe(1);
  });

  it("con la fase cerrada no entra ninguna papeleta", async () => {
    await prisma.event.update({ where: { id: eventId }, data: { phase: "NOMINATIONS_CLOSED" } });
    expect(await send(ids.approved2)).toEqual({ ok: false, reason: "closed" });
    const participant = await prisma.participant.findUniqueOrThrow({ where: { id: ids.approved2 } });
    expect(participant.hasNominated).toBe(false);
  });

  it("la papeleta guardada no tiene ningún dato del participante", async () => {
    const ballot = await prisma.ballot.findFirstOrThrow({ where: { eventId } });
    expect(Object.keys(ballot).sort()).toEqual(["ciphertext", "eventId", "id", "phase", "receiptCode"]);
  });
});
