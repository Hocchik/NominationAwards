"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { GROUP_PHOTO_SLOTS } from "@/lib/event/groupPhotos";
import { getCurrentEvent } from "@/lib/event/queries";

// Fotos grupales de la entrada de Nominados (hasta 3). Son recuerdos del grupo:
// no tocan nominaciones ni votos, así que se pueden cambiar en cualquier fase.

/** Tope del data URL: la foto llega ya reducida a ~1600 px desde el navegador. */
const MAX_DATA_URL = 900_000;

const slotSchema = z.number().int().min(0).max(GROUP_PHOTO_SLOTS - 1);
const captionSchema = z.string().trim().max(50, "El pie de foto puede tener hasta 50 caracteres.");

type Result = { ok: boolean; message?: string };

async function currentEvent() {
  await requireAdmin();
  return getCurrentEvent();
}

/** Guarda (o reemplaza) la foto de un lugar. El pie de foto se conserva. */
export async function setGroupPhotoAction(slot: number, dataUrl: string): Promise<Result> {
  const event = await currentEvent();
  if (!event) return { ok: false, message: "Primero crea el evento." };
  if (!slotSchema.safeParse(slot).success) return { ok: false, message: "Ese lugar no existe." };
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > MAX_DATA_URL) {
    return { ok: false, message: "La foto no tiene el formato esperado o es muy grande." };
  }
  await prisma.groupPhoto.upsert({
    where: { eventId_slot: { eventId: event.id, slot } },
    create: { eventId: event.id, slot, photoUrl: dataUrl },
    update: { photoUrl: dataUrl },
  });
  refresh();
  return { ok: true };
}

export async function setGroupPhotoCaptionAction(slot: number, caption: string): Promise<Result> {
  const event = await currentEvent();
  if (!event) return { ok: false, message: "Primero crea el evento." };
  if (!slotSchema.safeParse(slot).success) return { ok: false, message: "Ese lugar no existe." };
  const parsed = captionSchema.safeParse(caption);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const updated = await prisma.groupPhoto.updateMany({ where: { eventId: event.id, slot }, data: { caption: parsed.data } });
  if (updated.count === 0) return { ok: false, message: "Primero sube la foto." };
  refresh();
  return { ok: true, message: "Guardado." };
}

export async function removeGroupPhotoAction(slot: number): Promise<Result> {
  const event = await currentEvent();
  if (!event) return { ok: false, message: "Primero crea el evento." };
  if (!slotSchema.safeParse(slot).success) return { ok: false, message: "Ese lugar no existe." };
  await prisma.groupPhoto.deleteMany({ where: { eventId: event.id, slot } });
  refresh();
  return { ok: true };
}
