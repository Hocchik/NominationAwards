import { z } from "zod";
import { cleanDisplayName } from "./names";

export const displayNameSchema = z
  .string("Escribe un nombre.")
  .transform(cleanDisplayName)
  .pipe(
    z
      .string()
      .min(2, "Cada nombre debe tener al menos 2 letras.")
      .max(40, "Cada nombre puede tener hasta 40 caracteres."),
  );
