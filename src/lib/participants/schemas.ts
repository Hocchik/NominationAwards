import { z } from "zod";
import { cleanDisplayName } from "./names";

export const pinSchema = z
  .string("Escribe tu PIN.")
  .regex(/^\d{4,6}$/, "El PIN debe tener de 4 a 6 números.");

export const displayNameSchema = z
  .string("Escribe tu nombre.")
  .transform(cleanDisplayName)
  .pipe(
    z
      .string()
      .min(2, "Tu nombre debe tener al menos 2 letras.")
      .max(40, "Tu nombre puede tener hasta 40 caracteres."),
  );

/** Crear un PIN (registro o PIN restablecido): se pide dos veces. */
export const newPinSchema = z
  .object({ pin: pinSchema, pinConfirm: z.string() })
  .refine((d) => d.pin === d.pinConfirm, {
    path: ["pinConfirm"],
    message: "Los dos PIN no coinciden.",
  });
