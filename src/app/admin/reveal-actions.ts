"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { PRESET_CATEGORIES } from "@/lib/event/presetCategories";
import { getCurrentEvent } from "@/lib/event/queries";
import { isFullOrder, presetRevealOrder } from "@/lib/event/reveal";
import { canEditRevealOrder } from "@/lib/event/rules";

// Orden de la ceremonia (CLAUDE.md §3, paso 4): lo acomoda el organizador para
// todas las categorías y se guarda de una vez. No toca papeletas ni votos.

type Result = { ok: boolean; message?: string };

async function editableEvent() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canEditRevealOrder(event.phase)) return null;
  return event;
}

async function saveOrder(eventId: string, ids: string[]) {
  const current = await prisma.category.findMany({ where: { eventId }, select: { id: true, revealOrder: true } });
  const before = new Map(current.map((c) => [c.id, c.revealOrder]));
  const changes = ids.flatMap((id, index) => (before.get(id) === index + 1 ? [] : [{ id, revealOrder: index + 1 }]));
  if (changes.length) {
    await prisma.$transaction(changes.map((c) => prisma.category.update({ where: { id: c.id }, data: { revealOrder: c.revealOrder } })));
  }
}

export async function saveRevealOrderAction(order: string[]): Promise<Result> {
  const event = await editableEvent();
  if (!event) return { ok: false, message: "La ceremonia ya empezó: el orden queda fijo." };
  const ids = (await prisma.category.findMany({ where: { eventId: event.id }, select: { id: true } })).map((c) => c.id);
  if (!Array.isArray(order) || !isFullOrder(order.map(String), ids)) {
    return { ok: false, message: "Las categorías cambiaron mientras ordenabas. Recarga la página e inténtalo de nuevo." };
  }
  await saveOrder(event.id, order.map(String));
  refresh();
  return { ok: true, message: "Orden guardado." };
}

export async function resetRevealOrderAction(): Promise<void> {
  const event = await editableEvent();
  if (!event) return;
  const items = await prisma.category.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true, revealOrder: true, sortOrder: true },
  });
  await saveOrder(event.id, presetRevealOrder(items, PRESET_CATEGORIES));
  refresh();
}
