"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { MAX_FINALISTS, canAddCategoryOptions, canEditStructure } from "@/lib/event/rules";
import { isSmallJpegDataUrl } from "@/lib/photos";

// Opciones que carga el organizador en las categorías de opciones (profes,
// eventos, frases). Se nominan entre ellas; siempre gana una.

const optionSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().trim().min(1, "Escribe la opción.").max(160, "Hasta 160 caracteres."),
  blurb: z.string().trim().max(80, "El detalle puede tener hasta 80 caracteres."),
  photoUrl: z.string().nullable(),
});

export async function addCategoryOptionAction(input: z.input<typeof optionSchema>): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canAddCategoryOptions(event.phase)) {
    return { ok: false, message: "Las opciones se cargan antes de que cierren las nominaciones." };
  }
  const parsed = optionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la opción." };
  const { categoryId, label, blurb, photoUrl } = parsed.data;
  if (photoUrl && !isSmallJpegDataUrl(photoUrl)) return { ok: false, message: "La foto no tiene el formato esperado." };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, eventId: event.id, nomineeKind: { in: ["OPTION", "DIRECT"] } },
  });
  if (!category) return { ok: false, message: "La categoría ya no existe o no es de opciones." };
  // En las de finalistas directos cada opción es un finalista: mismo tope que el resto.
  if (category.nomineeKind === "DIRECT") {
    const count = await prisma.categoryOption.count({ where: { categoryId } });
    if (count >= MAX_FINALISTS) return { ok: false, message: `Hasta ${MAX_FINALISTS} opciones: cada una es un finalista.` };
  }

  const last = await prisma.categoryOption.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
  await prisma.categoryOption.create({
    data: { categoryId, label, blurb: blurb || null, photoUrl, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  refresh();
  return { ok: true };
}

export async function setCategoryOptionPhotoAction(id: string, photoUrl: string | null): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canAddCategoryOptions(event.phase)) return { ok: false, message: "Las opciones ya no se pueden cambiar." };
  if (photoUrl && !isSmallJpegDataUrl(photoUrl)) return { ok: false, message: "La foto no tiene el formato esperado." };
  const option = await prisma.categoryOption.findFirst({ where: { id, category: { eventId: event.id } } });
  if (!option) return { ok: false, message: "La opción ya no existe." };
  await prisma.categoryOption.update({ where: { id }, data: { photoUrl } });
  refresh();
  return { ok: true };
}

export async function deleteCategoryOptionAction(id: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const event = await getCurrentEvent();
  // Quitar una opción con las nominaciones abiertas dejaría papeletas apuntando a la nada.
  if (!event || !canEditStructure(event.phase)) {
    return { ok: false, message: "Las opciones solo se quitan durante la preparación." };
  }
  await prisma.categoryOption.deleteMany({ where: { id, category: { eventId: event.id } } });
  refresh();
  return { ok: true };
}
