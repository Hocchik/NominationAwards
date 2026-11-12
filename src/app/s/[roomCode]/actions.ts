"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { canRegister } from "@/lib/event/rules";
import type { FormState } from "@/lib/forms";
import { afterFailedAttempt, isLocked, minutesLeft } from "@/lib/participants/lockout";
import { normalizeName } from "@/lib/participants/names";
import { hashPin, verifyPin } from "@/lib/participants/pin";
import { countActiveRegistrations, getEventByRoomCode } from "@/lib/participants/queries";
import { displayNameSchema, newPinSchema, pinSchema } from "@/lib/participants/schemas";
import { endParticipantSession, startParticipantSession } from "@/lib/participants/session";

// Acciones de la sala. Son públicas (cualquiera con el link): todo se valida
// aquí y los mensajes de error no revelan más de lo necesario.

export type RoomFormState = FormState & {
  /** El admin restableció el PIN de ese nombre: hay que crear uno nuevo. */
  needsNewPin?: boolean;
};

const NO_ROOM: RoomFormState = { ok: false, message: "Esta sala no existe." };
const WRONG: RoomFormState = { ok: false, message: "Nombre o PIN incorrecto." };

function errorsWithName(error: z.ZodError, name: string): RoomFormState {
  // Se devuelve el nombre para no tener que escribirlo de nuevo; nunca el PIN.
  return { ok: false, errors: z.flattenError(error).fieldErrors, values: { name } };
}

export async function registerAction(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const event = await getEventByRoomCode(String(formData.get("roomCode") ?? ""));
  if (!event) return NO_ROOM;
  if (!canRegister(event.phase)) {
    return { ok: false, message: "El registro no está abierto en este momento." };
  }

  const name = String(formData.get("name") ?? "");
  const parsed = z
    .object({ name: displayNameSchema })
    .and(newPinSchema)
    .safeParse({ name, pin: formData.get("pin"), pinConfirm: formData.get("pinConfirm") });
  if (!parsed.success) return errorsWithName(parsed.error, name);

  if ((await countActiveRegistrations(event.id)) >= event.capacity) {
    return { ok: false, message: "La sala está llena. Habla con el organizador." };
  }

  try {
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        displayName: parsed.data.name,
        normalizedName: normalizeName(parsed.data.name),
        pinHash: await hashPin(parsed.data.pin),
      },
    });
    await startParticipantSession(participant);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        errors: { name: ["Ese nombre ya está registrado. Si eres tú, entra con «Ya me registré»."] },
        values: { name },
      };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function loginAction(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const event = await getEventByRoomCode(String(formData.get("roomCode") ?? ""));
  if (!event) return NO_ROOM;

  const name = String(formData.get("name") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { eventId_normalizedName: { eventId: event.id, normalizedName: normalizeName(name) } },
  });
  if (!participant || participant.status === "REJECTED") return { ...WRONG, values: { name } };
  if (participant.pinReset) {
    return { ok: false, needsNewPin: true, values: { name } };
  }

  const now = new Date();
  if (isLocked(participant.lockedUntil, now)) {
    const minutes = minutesLeft(participant.lockedUntil!, now);
    return {
      ok: false,
      message: `Demasiados intentos. Prueba de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
      values: { name },
    };
  }

  const pin = pinSchema.safeParse(formData.get("pin"));
  if (!pin.success || !(await verifyPin(pin.data, participant.pinHash))) {
    await prisma.participant.update({
      where: { id: participant.id },
      data: afterFailedAttempt(participant.failedAttempts, now),
    });
    return { ...WRONG, values: { name } };
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  await startParticipantSession(participant);
  refresh();
  return { ok: true };
}

/** Crear un PIN nuevo después de que el admin lo restableció. */
export async function setNewPinAction(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const event = await getEventByRoomCode(String(formData.get("roomCode") ?? ""));
  if (!event) return NO_ROOM;

  const name = String(formData.get("name") ?? "");
  const parsed = newPinSchema.safeParse({
    pin: formData.get("pin"),
    pinConfirm: formData.get("pinConfirm"),
  });
  if (!parsed.success) return { ...errorsWithName(parsed.error, name), needsNewPin: true };

  const pinHash = await hashPin(parsed.data.pin);
  // Solo si sigue pendiente de PIN nuevo: si otra pestaña ya lo creó, no se pisa.
  const result = await prisma.participant.updateMany({
    where: { eventId: event.id, normalizedName: normalizeName(name), pinReset: true },
    data: { pinHash, pinReset: false, failedAttempts: 0, lockedUntil: null },
  });
  if (result.count !== 1) {
    return { ok: false, message: "Ese PIN ya se creó. Entra con tu nombre y PIN.", values: { name } };
  }
  const participant = await prisma.participant.findUniqueOrThrow({
    where: { eventId_normalizedName: { eventId: event.id, normalizedName: normalizeName(name) } },
  });
  await startParticipantSession(participant);
  refresh();
  return { ok: true };
}

export async function logoutParticipantAction(): Promise<void> {
  await endParticipantSession();
  refresh();
}
