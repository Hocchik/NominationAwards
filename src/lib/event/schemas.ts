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
    // Cuántos pone cada persona y cuántos finalistas pasan se definen por categoría.
    maxPrizeCategories: intField("Máximo de categorías de premio", 1, 50),
    showWinnerPercent: z.boolean(),
    allowNominationSkip: z.boolean(),
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
    nominationsCloseAt: optionalDate,
    votingOpensAt: optionalDate,
    votingClosesAt: optionalDate,
  })
  .refine((d) => !d.votingOpensAt || !d.votingClosesAt || d.votingClosesAt > d.votingOpensAt, {
    path: ["votingClosesAt"],
    message: "El cierre debe ser después de la apertura.",
  })
  .refine((d) => !d.nominationsCloseAt || !d.votingOpensAt || d.votingOpensAt > d.nominationsCloseAt, {
    path: ["votingOpensAt"],
    message: "La votación debe abrir después del cierre de nominaciones.",
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
    .min(2, "Escribe el criterio (lo que verá el grupo).")
    .max(400, "El criterio puede tener hasta 400 caracteres."),
  type: z.enum(["PRIZE", "HONORARY"], "Elige si es de premio u honorífica."),
  framing: z.enum(["NORMAL", "PRONE", "QUESTION"], "Elige cómo se lee el título."),
  nomineeKind: z.enum(["PERSON", "PAIR", "OPTION", "TEXT", "DIRECT"], "Elige qué se nomina."),
  maxPicks: intField("Cuántos pone cada persona", 1, 5),
  minPicks: intField("Mínimo obligatorio", 0, 5),
  finalistCount: intField("Finalistas", 3, 5),
  allowExternal: z.boolean(),
});
