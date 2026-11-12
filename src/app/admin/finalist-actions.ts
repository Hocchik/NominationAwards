"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { phaseIndex } from "@/lib/event/phases";
import { getCurrentEvent } from "@/lib/event/queries";
import { insertIntoReveal, suggestedRevealOrder } from "@/lib/event/reveal";
import { canEditVoteRules } from "@/lib/event/rules";

// Finalistas (CLAUDE.md §3, paso 4): elegir qué categorías pasan a la
// votación, su orden en la ceremonia, y foto o frase opcional por finalista.

/** Evento con finalistas y todavía antes de la votación (o de la ceremonia). */
async function eventAfterClosing(until: "VOTING" | "CEREMONY") {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return null;
  const index = phaseIndex(event.phase);
  if (index < phaseIndex("FINALISTS_READY") || index >= phaseIndex(until)) return null;
  return event;
}

async function activeCategories(eventId: string) {
  return prisma.category.findMany({
    where: { eventId, activeForVote: true },
    select: { id: true, type: true, sortOrder: true },
    orderBy: [{ revealOrder: "asc" }, { sortOrder: "asc" }],
  });
}

async function saveRevealOrder(ids: string[]) {
  await prisma.$transaction(
    ids.map((id, index) => prisma.category.update({ where: { id }, data: { revealOrder: index } })),
  );
}

export async function setCategoryActiveAction(formData: FormData): Promise<void> {
  const event = await eventAfterClosing("VOTING");
  if (!event || !canEditVoteRules(event.phase)) return;
  const category = await prisma.category.findFirst({
    where: { id: String(formData.get("id") ?? ""), eventId: event.id },
    include: { _count: { select: { finalists: true } } },
  });
  if (!category) return;
  const activate = formData.get("active") === "true";

  if (activate) {
    if (category.activeForVote || category._count.finalists === 0) return;
    if (category.type === "PRIZE") {
      const prizes = await prisma.category.count({
        where: { eventId: event.id, activeForVote: true, type: "PRIZE" },
      });
      if (prizes >= event.maxPrizeCategories) return;
    }
    const order = insertIntoReveal(await activeCategories(event.id), category);
    await prisma.category.update({ where: { id: category.id }, data: { activeForVote: true } });
    await saveRevealOrder(order);
  } else {
    await prisma.category.update({ where: { id: category.id }, data: { activeForVote: false, revealOrder: 0 } });
    await saveRevealOrder((await activeCategories(event.id)).map((c) => c.id));
  }
  refresh();
}

export async function moveRevealAction(formData: FormData): Promise<void> {
  const event = await eventAfterClosing("VOTING");
  if (!event) return;
  const ids = (await activeCategories(event.id)).map((c) => c.id);
  const from = ids.indexOf(String(formData.get("id") ?? ""));
  const to = from + (formData.get("direction") === "up" ? -1 : 1);
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await saveRevealOrder(ids);
  refresh();
}

export async function suggestRevealOrderAction(): Promise<void> {
  const event = await eventAfterClosing("VOTING");
  if (!event) return;
  await saveRevealOrder(suggestedRevealOrder(await activeCategories(event.id)));
  refresh();
}

async function ownFinalist(eventId: string, finalistId: string) {
  return prisma.finalist.findFirst({ where: { id: finalistId, category: { eventId } }, select: { id: true } });
}

const blurbSchema = z.string().trim().max(120, "La frase puede tener hasta 120 caracteres.");

export async function updateFinalistBlurbAction(
  _prev: { ok: boolean; message?: string },
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const event = await eventAfterClosing("CEREMONY");
  if (!event) return { ok: false, message: "Ya no se pueden editar los finalistas." };
  const finalist = await ownFinalist(event.id, String(formData.get("id") ?? ""));
  if (!finalist) return { ok: false, message: "Ese finalista ya no existe." };
  const parsed = blurbSchema.safeParse(formData.get("blurb") ?? "");
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  await prisma.finalist.update({ where: { id: finalist.id }, data: { blurb: parsed.data || null } });
  refresh();
  return { ok: true, message: "Guardado." };
}

/** Foto ya reducida en el navegador (JPEG pequeño, como data URL). null la quita. */
export async function setFinalistPhotoAction(
  finalistId: string,
  dataUrl: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const event = await eventAfterClosing("CEREMONY");
  if (!event) return { ok: false, message: "Ya no se pueden editar los finalistas." };
  const finalist = await ownFinalist(event.id, finalistId);
  if (!finalist) return { ok: false, message: "Ese finalista ya no existe." };
  if (dataUrl !== null && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 200_000)) {
    return { ok: false, message: "La foto no tiene el formato esperado o es muy grande." };
  }
  await prisma.finalist.update({ where: { id: finalist.id }, data: { photoUrl: dataUrl } });
  refresh();
  return { ok: true };
}
