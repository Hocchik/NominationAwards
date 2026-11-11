"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import {
  checkAdminPassword,
  endAdminSession,
  requireAdmin,
  startAdminSession,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { ADVANCE_MODE, PHASES, PHASE_LABELS, getAdvanceBlockers, nextPhase } from "@/lib/event/phases";
import { getCategories, getCurrentEvent, getPhaseContext } from "@/lib/event/queries";
import { generateRoomCode } from "@/lib/event/roomCode";
import {
  canEditCategoryText,
  canEditFinalistsCount,
  canEditMaxPrize,
  canEditSchedule,
  canEditStructure,
  canEditWinnerPercent,
} from "@/lib/event/rules";
import {
  categorySchema,
  eventNameSchema,
  eventSettingsSchema,
  scheduleSchema,
} from "@/lib/event/schemas";
import type { FormState } from "@/lib/forms";

// Todas las acciones de admin empiezan con requireAdmin(): una Server Action es
// un endpoint público y se puede llamar sin pasar por la página.

const NO_EVENT: FormState = { ok: false, message: "Primero crea el evento." };

function fieldErrors(error: z.ZodError, formData: FormData): FormState {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // Los campos "$ACTION…" los agrega Next.js; no son del formulario.
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return { ok: false, errors: z.flattenError(error).fieldErrors, values };
}

// --- Sesión ----------------------------------------------------------------

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { ok: false, message: "Escribe la contraseña." };
  }
  if (!checkAdminPassword(password)) {
    // Frena los intentos por fuerza bruta; la defensa real es una contraseña larga.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { ok: false, message: "Contraseña incorrecta." };
  }
  await startAdminSession();
  redirect("/admin/evento");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin");
}

// --- Evento ----------------------------------------------------------------

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = eventNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { ok: false, errors: { name: parsed.error.issues.map((i) => i.message) } };
  }
  if ((await prisma.event.count()) > 0) {
    return { ok: false, message: "Ya existe un evento." };
  }
  // El código de sala es único: si justo sale uno repetido, se prueba otro.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.event.create({ data: { name: parsed.data, roomCode: generateRoomCode() } });
      refresh();
      return { ok: true };
    } catch (error) {
      const duplicated =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!duplicated) throw error;
    }
  }
  return { ok: false, message: "No se pudo generar el código de la sala. Intenta de nuevo." };
}

export async function updateEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return NO_EVENT;
  const { phase } = event;

  // Los campos bloqueados en esta fase llegan deshabilitados (el navegador no
  // los envía): se conserva el valor guardado aunque alguien fuerce el envío.
  const parsed = eventSettingsSchema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    minNominations: canEditStructure(phase) ? formData.get("minNominations") : event.minNominations,
    maxNominations: canEditStructure(phase) ? formData.get("maxNominations") : event.maxNominations,
    finalistsPerCategory: canEditFinalistsCount(phase)
      ? formData.get("finalistsPerCategory")
      : event.finalistsPerCategory,
    maxPrizeCategories: canEditMaxPrize(phase)
      ? formData.get("maxPrizeCategories")
      : event.maxPrizeCategories,
    showWinnerPercent: canEditWinnerPercent(phase)
      ? formData.get("showWinnerPercent") === "on"
      : event.showWinnerPercent,
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  const registered = await prisma.participant.count({ where: { eventId: event.id } });
  if (parsed.data.capacity < registered) {
    return {
      ok: false,
      errors: { capacity: [`Ya hay ${registered} registros: la capacidad no puede ser menor.`] },
    };
  }

  await prisma.event.update({ where: { id: event.id }, data: parsed.data });
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

export async function updateScheduleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return NO_EVENT;
  if (!canEditSchedule(event.phase)) {
    return { ok: false, message: "La votación ya cerró: el horario no se puede cambiar." };
  }
  const parsed = scheduleSchema.safeParse({
    votingOpensAt: formData.get("votingOpensAt") ?? "",
    votingClosesAt: formData.get("votingClosesAt") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  await prisma.event.update({ where: { id: event.id }, data: parsed.data });
  refresh();
  return { ok: true, message: "Horario guardado." };
}

export async function advancePhaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return NO_EVENT;

  const from = z.enum(PHASES).safeParse(formData.get("from"));
  if (!from.success || from.data !== event.phase) {
    return { ok: false, message: "La fase cambió mientras tanto. Recarga la página." };
  }
  const to = nextPhase(from.data);
  if (!to || ADVANCE_MODE[from.data] !== "button") {
    return { ok: false, message: "Esta fase no se avanza con el botón." };
  }
  const blockers = getAdvanceBlockers(await getPhaseContext(event));
  if (blockers.length > 0) {
    return { ok: false, message: blockers.join(" ") };
  }

  // Solo avanza si la fase sigue siendo la misma: si dos pestañas confirman a
  // la vez, una sola gana y la otra no salta dos fases.
  const result = await prisma.event.updateMany({
    where: { id: event.id, phase: from.data },
    data: { phase: to },
  });
  if (result.count !== 1) {
    return { ok: false, message: "La fase cambió mientras tanto. Recarga la página." };
  }
  refresh();
  return { ok: true, message: `Ahora: ${PHASE_LABELS[to]}.` };
}

// --- Categorías ------------------------------------------------------------

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return NO_EVENT;
  if (!canEditStructure(event.phase)) {
    return { ok: false, message: "Las categorías solo se crean durante la preparación." };
  }
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type"),
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  const last = await prisma.category.aggregate({
    where: { eventId: event.id },
    _max: { sortOrder: true },
  });
  await prisma.category.create({
    data: { ...parsed.data, eventId: event.id, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  refresh();
  return { ok: true, message: `Categoría «${parsed.data.name}» creada.` };
}

export async function updateCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return NO_EVENT;
  const category = await prisma.category.findFirst({
    where: { id: String(formData.get("id") ?? ""), eventId: event.id },
  });
  if (!category) return { ok: false, message: "La categoría ya no existe." };
  if (!canEditCategoryText(event.phase)) {
    return { ok: false, message: "En la ceremonia ya no se editan las categorías." };
  }
  // El tipo cambia quién compite y cuántas caben en la votación: solo en preparación.
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    type: canEditStructure(event.phase) ? formData.get("type") : category.type,
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  await prisma.category.update({ where: { id: category.id }, data: parsed.data });
  refresh();
  return { ok: true };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canEditStructure(event.phase)) return;
  await prisma.category.deleteMany({
    where: { id: String(formData.get("id") ?? ""), eventId: event.id },
  });
  refresh();
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || !canEditStructure(event.phase)) return;

  const categories = await getCategories(event.id);
  const from = categories.findIndex((c) => c.id === formData.get("id"));
  const to = from + (formData.get("direction") === "up" ? -1 : 1);
  if (from < 0 || to < 0 || to >= categories.length) return;

  // Se reescribe el orden completo (0, 1, 2…): así se corrigen de paso
  // posiciones repetidas en vez de solo intercambiar dos números.
  const ordered = [...categories];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  await prisma.$transaction(
    ordered
      .map((category, index) => ({ category, index }))
      .filter(({ category, index }) => category.sortOrder !== index)
      .map(({ category, index }) =>
        prisma.category.update({ where: { id: category.id }, data: { sortOrder: index } }),
      ),
  );
  refresh();
}
