import "client-only";

import { z } from "zod";
import { type KeyPair, keyPairMatches } from "./keys";

// Archivo que descarga el notario con sus dos llaves privadas. Lo vuelve a
// cargar en el cierre de nominaciones (llave de nominaciones) y en la
// ceremonia (llave de votación). Nunca se sube al servidor.

export interface NotaryKeyFile {
  app: "NominacionesDP";
  version: 1;
  eventId: string;
  eventName: string;
  nomination: KeyPair;
  vote: KeyPair;
}

const keyPairSchema = z.object({ publicKey: z.string().min(1), privateKey: z.string().min(1) });

const keyFileSchema = z.object({
  app: z.literal("NominacionesDP"),
  version: z.literal(1),
  eventId: z.string().min(1),
  eventName: z.string(),
  nomination: keyPairSchema,
  vote: keyPairSchema,
});

const INSTRUCTIONS =
  "Archivo de llaves privadas del notario. Guárdalo en dos lugares (por ejemplo, " +
  "tu computador y una memoria USB) y no lo compartas con nadie, tampoco con el " +
  "organizador. Lo vas a necesitar para abrir las nominaciones y para la ceremonia. " +
  "Si se pierde, no hay forma de recuperar las papeletas.";

export function buildKeyFile(data: Omit<NotaryKeyFile, "app" | "version">): string {
  const file: NotaryKeyFile & { instrucciones: string } = {
    app: "NominacionesDP",
    version: 1,
    ...data,
    instrucciones: INSTRUCTIONS,
  };
  return JSON.stringify(file, null, 2);
}

/** Nombre del archivo. Coincide con un patrón de .gitignore por si acaba en el repo. */
export function keyFileName(eventName: string): string {
  const slug = eventName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `notario-llaves-privadas-${slug || "evento"}.json`;
}

/**
 * Lee y comprueba un archivo de llaves: formato correcto y cada llave privada
 * corresponde a su pública. Lanza un error con un mensaje para el notario.
 */
export async function parseKeyFile(text: string): Promise<NotaryKeyFile> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("No es un archivo de llaves válido (no se pudo leer).");
  }
  const parsed = keyFileSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("No es un archivo de llaves de esta app, o le faltan datos.");
  }
  const file = parsed.data;
  const [nominationOk, voteOk] = await Promise.all([
    keyPairMatches(file.nomination),
    keyPairMatches(file.vote),
  ]);
  if (!nominationOk || !voteOk) {
    throw new Error("El archivo está dañado: una llave privada no corresponde a su llave pública.");
  }
  return file;
}
