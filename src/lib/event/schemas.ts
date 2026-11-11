import { z } from "zod";

// Validación de lo que el admin escribe. Se usa en el servidor (Server
// Actions): el navegador puede saltarse cualquier validación del formulario.

function intField(label: string, min: number, max: number) {
  return z.coerce
    .number(`${label}: escribe un número.`)
    .int(`${label}: debe ser un número entero.`)
    .min(min, `${label}: mínimo ${min}.`)
    .max(max, `${label}: máximo ${max}.`);
}

export const eventNameSchema = z
  .string("Escribe un nombre.")
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres.")
  .max(80, "El nombre puede tener hasta 80 caracteres.");

export const eventSettingsSchema = z
  .object({
    name: eventNameSchema,
    capacity: intField("Capacidad", 2, 200),
    minNominations: intField("Mínimo de nominaciones", 1, 10),
    maxNominations: intField("Máximo de nominaciones", 1, 10),
    finalistsPerCategory: intField("Finalistas por categoría", 2, 8),
    maxPrizeCategories: intField("Máximo de categorías de premio", 1, 50),
    showWinnerPercent: z.boolean(),
  })
  .refine((d) => d.maxNominations >= d.minNominations, {
    path: ["maxNominations"],
    message: "El máximo de nominaciones no puede ser menor que el mínimo.",
  });

/** "" = sin definir; si no, una fecha ISO que arma el navegador del admin. */
const optionalDate = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Fecha no válida." });
      return z.NEVER;
    }
    return date;
  });

export const scheduleSchema = z
  .object({
    votingOpensAt: optionalDate,
    votingClosesAt: optionalDate,
  })
  .refine((d) => !d.votingOpensAt || !d.votingClosesAt || d.votingClosesAt > d.votingOpensAt, {
    path: ["votingClosesAt"],
    message: "El cierre debe ser después de la apertura.",
  });

export const categorySchema = z.object({
  name: z
    .string("Escribe un nombre.")
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(60, "El nombre puede tener hasta 60 caracteres."),
  description: z
    .string("Escribe la consigna.")
    .trim()
    .min(2, "Escribe la consigna (la pregunta que verá el grupo).")
    .max(240, "La consigna puede tener hasta 240 caracteres."),
  type: z.enum(["PRIZE", "HONORARY"], "Elige si es de premio u honorífica."),
});
