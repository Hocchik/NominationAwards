import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import type { Event } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PhaseContext } from "./phases";
import { scheduledPhase } from "./schedule";
import { movePhase } from "./transition";

// La app maneja un solo evento a la vez (la premiación del grupo).

export async function getCurrentEvent(): Promise<Event | null> {
  const event = await prisma.event.findFirst();
  return event && applySchedule(event);
}

/**
 * Si el horario de votación ya llegó (o ya pasó), avanza la fase antes de
 * devolver el evento. El cambio es atómico: si dos visitas llegan a la vez,
 * solo una lo aplica y la otra lee el resultado.
 */
export async function applySchedule(event: Event): Promise<Event> {
  const scheduled =
    event.phase === "NOMINATIONS"
      ? Boolean(event.nominationsCloseAt)
      : (event.phase === "FINALISTS_READY" || event.phase === "VOTING") &&
        Boolean(event.votingOpensAt || event.votingClosesAt);
  if (!scheduled) return event;

  await connection(); // la hora se lee en cada petición, nunca en el prerender
  const readyToOpen =
    event.phase === "FINALISTS_READY" &&
    Boolean(event.votePublicKey) &&
    (await prisma.category.count({ where: { eventId: event.id, activeForVote: true } })) > 0;
  const next = scheduledPhase({
    phase: event.phase,
    now: new Date(),
    nominationsCloseAt: event.nominationsCloseAt,
    votingOpensAt: event.votingOpensAt,
    votingClosesAt: event.votingClosesAt,
    readyToOpen,
  });
  if (!next) return event;

  // Al cerrar una urna por horario, sus sobres pierden el nombre en la misma
  // transacción (regla 2), igual que con el botón del panel.
  await movePhase(event.id, event.phase, next);
  return (await prisma.event.findUnique({ where: { id: event.id } })) ?? event;
}

export function getCategories(eventId: string) {
  return prisma.category.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPhaseContext(event: Event): Promise<PhaseContext> {
  await connection(); // usa la hora actual: se calcula en cada petición
  const [categoryCount, guestCount, activePrizeCount, activeHonoraryCount] = await Promise.all([
    prisma.category.count({ where: { eventId: event.id } }),
    prisma.participant.count({ where: { eventId: event.id } }),
    prisma.category.count({ where: { eventId: event.id, activeForVote: true, type: "PRIZE" } }),
    prisma.category.count({ where: { eventId: event.id, activeForVote: true, type: "HONORARY" } }),
  ]);
  return {
    phase: event.phase,
    categoryCount,
    guestCount,
    activePrizeCount,
    activeHonoraryCount,
    maxPrizeCategories: event.maxPrizeCategories,
    hasNominationKey: Boolean(event.nominationPublicKey),
    hasVoteKey: Boolean(event.votePublicKey),
    nominationsCloseAt: event.nominationsCloseAt,
    votingOpensAt: event.votingOpensAt,
    votingClosesAt: event.votingClosesAt,
    now: new Date(),
  };
}

/**
 * Dirección pública de la app. Usa APP_URL si está definida (recomendado en
 * Vercel); si no, el host con el que se abrió el panel.
 */
export async function getBaseUrl(): Promise<string> {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  if (base) return base;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Link público de la sala: el único que se comparte con el grupo. */
export async function getRoomUrl(roomCode: string): Promise<string> {
  return `${await getBaseUrl()}/s/${roomCode}`;
}
