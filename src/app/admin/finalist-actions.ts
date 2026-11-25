"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { phaseIndex } from "@/lib/event/phases";
import { getCurrentEvent } from "@/lib/event/queries";
import { canEditVoteRules } from "@/lib/event/rules";

// Finalistas (CLAUDE.md §3, paso 4): elegir qué categorías pasan a la
// votación y foto o frase opcional por finalista. El orden de la ceremonia se
// acomoda aparte (reveal-actions.ts) y activar una categoría no lo cambia.

/** Evento con finalistas y todavía antes de la votación (o de la ceremonia). */
async function eventAfterClosing(until: "VOTING" | "CEREMONY") {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return null;
  const index = phaseIndex(event.phase);
  if (index < phaseIndex("FINALISTS_READY") || index >= phaseIndex(until)) return null;
  return event;
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
    await prisma.category.update({ where: { id: category.id }, data: { activeForVote: true } });
  } else {
    await prisma.category.update({ where: { id: category.id }, data: { activeForVote: false } });
  }
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
