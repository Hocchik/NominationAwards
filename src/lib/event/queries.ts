import "server-only";

import { headers } from "next/headers";
import type { Event } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PhaseContext } from "./phases";

// La app maneja un solo evento a la vez (la premiación del grupo).

export function getCurrentEvent(): Promise<Event | null> {
  return prisma.event.findFirst();
}

export function getCategories(eventId: string) {
  return prisma.category.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPhaseContext(event: Event): Promise<PhaseContext> {
  const [categoryCount, activePrizeCount, activeHonoraryCount] = await Promise.all([
    prisma.category.count({ where: { eventId: event.id } }),
    prisma.category.count({ where: { eventId: event.id, activeForVote: true, type: "PRIZE" } }),
    prisma.category.count({ where: { eventId: event.id, activeForVote: true, type: "HONORARY" } }),
  ]);
  return {
    phase: event.phase,
    categoryCount,
    activePrizeCount,
    activeHonoraryCount,
    maxPrizeCategories: event.maxPrizeCategories,
    hasNominationKey: Boolean(event.nominationPublicKey),
    hasVoteKey: Boolean(event.votePublicKey),
    votingOpensAt: event.votingOpensAt,
    votingClosesAt: event.votingClosesAt,
  };
}

/**
 * Link público de la sala. Usa APP_URL si está definida (recomendado en
 * Vercel); si no, el host con el que se abrió el panel.
 */
export async function getRoomUrl(roomCode: string): Promise<string> {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  if (base) return `${base}/s/${roomCode}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/s/${roomCode}`;
}
