import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { movePhase } from "@/lib/event/transition";
import { discardBallot, recordBallot, removeGuest } from "./record";

// Test de integración contra la base real (CLAUDE.md §12): el envío atómico y
// los «sobres con nombre» solo se pueden comprobar de verdad con Postgres.
// Crea un evento temporal y lo borra al terminar. Se corre con `npm run test:db`.

const tag = `__test__${Date.now()}`;
let eventId = "";
const ids: Record<"ana" | "bruno" | "camila", string> = { ana: "", bruno: "", camila: "" };

const send = (participantId: string, phase: "NOMINATION" | "VOTE" = "NOMINATION") =>
  recordBallot({ eventId, participantId, phase, ciphertext: "QUJD" });

beforeAll(async () => {
  const event = await prisma.event.create({
    data: { name: tag, roomCode: `T${Date.now().toString(36).toUpperCase()}`, phase: "NOMINATIONS" },
  });
  eventId = event.id;
  await Promise.all(
    (Object.keys(ids) as (keyof typeof ids)[]).map((key) =>
      prisma.participant
        .create({ data: { eventId, displayName: `${tag}-${key}`, normalizedName: `${tag}-${key}` } })
        .then((p) => (ids[key] = p.id)),
    ),
  );
});

afterAll(async () => {
  if (eventId) {
    await prisma.ballot.deleteMany({ where: { eventId } });
    await prisma.participant.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
  }
  await prisma.$disconnect();
});

describe("envío atómico y sobres con nombre", () => {
  it("si la misma persona envía varias veces a la vez, solo se guarda una", async () => {
    const results = await Promise.all([send(ids.ana), send(ids.ana), send(ids.ana)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "already-sent")).toHaveLength(2);
    expect(await prisma.ballot.count({ where: { eventId } })).toBe(1);
    expect((await prisma.participant.findUniqueOrThrow({ where: { id: ids.ana } })).hasNominated).toBe(true);
  });

  it("mientras la urna está abierta, el sobre lleva el nombre de quien lo envió y nada más", async () => {
    const ballot = await prisma.ballot.findFirstOrThrow({ where: { eventId } });
    expect(Object.keys(ballot).sort()).toEqual(["ciphertext", "eventId", "id", "participantId", "phase"]);
    expect(ballot.participantId).toBe(ids.ana);
  });

  it("resetear bota el sobre sin abrirlo, deja volver a enviar y cierra sus sesiones", async () => {
    const before = await prisma.participant.findUniqueOrThrow({ where: { id: ids.ana } });
    expect(await discardBallot({ eventId, participantId: ids.ana, phase: "NOMINATION" })).toEqual({ ok: true });
    const after = await prisma.participant.findUniqueOrThrow({ where: { id: ids.ana } });
    expect(after.hasNominated).toBe(false);
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await prisma.ballot.count({ where: { eventId } })).toBe(0);
    expect(await send(ids.ana)).toEqual({ ok: true });
    // Sin sobre que botar, no se puede devolver el envío (quedarían dos).
    expect(await discardBallot({ eventId, participantId: ids.bruno, phase: "NOMINATION" })).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("al cerrar la urna, los sobres pierden el nombre y ya no se puede resetear", async () => {
    await send(ids.bruno);
    expect(await movePhase(eventId, "NOMINATIONS", "NOMINATIONS_CLOSED")).toBe(true);
    expect(await prisma.ballot.count({ where: { eventId, participantId: { not: null } } })).toBe(0);
    expect(await prisma.ballot.count({ where: { eventId } })).toBe(2);
    expect(await discardBallot({ eventId, participantId: ids.bruno, phase: "NOMINATION" })).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(await send(ids.camila)).toEqual({ ok: false, reason: "closed" });
    // Si otra pestaña ya cambió la fase, no salta de nuevo.
    expect(await movePhase(eventId, "NOMINATIONS", "NOMINATIONS_CLOSED")).toBe(false);
  });

  it("en la votación, el doble voto simultáneo también deja uno solo", async () => {
    await prisma.event.update({ where: { id: eventId }, data: { phase: "VOTING" } });
    const results = await Promise.all([send(ids.camila, "VOTE"), send(ids.camila, "VOTE")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await prisma.ballot.count({ where: { eventId, phase: "VOTE" } })).toBe(1);
    const camila = await prisma.participant.findUniqueOrThrow({ where: { id: ids.camila } });
    expect(camila.hasVoted).toBe(true);
    expect(camila.hasNominated).toBe(false); // votar no toca la marca de nominar
  });

  it("quitar a alguien de la lista bota su sobre de la urna abierta; los ya cerrados siguen", async () => {
    await send(ids.bruno, "VOTE");
    await removeGuest({ eventId, participantId: ids.bruno });
    expect(await prisma.participant.count({ where: { id: ids.bruno } })).toBe(0);
    expect(await prisma.ballot.count({ where: { eventId, phase: "VOTE" } })).toBe(1); // solo el de Camila
    expect(await prisma.ballot.count({ where: { eventId, phase: "NOMINATION" } })).toBe(2);
  });

  it("al cerrar la votación, ningún voto queda con nombre", async () => {
    expect(await movePhase(eventId, "VOTING", "VOTING_CLOSED")).toBe(true);
    expect(await prisma.ballot.count({ where: { eventId, participantId: { not: null } } })).toBe(0);
  });
});
