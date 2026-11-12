import { z } from "zod";
import { cleanDisplayName, normalizeName } from "@/lib/participants/names";

// Papeleta de nominación (CLAUDE.md §6). Todo lo de este archivo es puro: se
// usa en el navegador al armar la papeleta y en el cierre para leerla.

export type Nominee = { type: "participant"; id: string } | { type: "external"; name: string };

export interface NominationBallot {
  v: 1;
  kind: "nomination";
  receipt: string;
  categories: Record<string, Nominee[]>;
}

export interface Candidate {
  id: string;
  name: string;
}

export const EXTERNAL_NAME_MAX = 40;

/**
 * Tamaño fijo (en bytes) de las papeletas de un evento. Depende del número de
 * categorías y del máximo de nominados, que se congelan al abrir las
 * nominaciones: todas las papeletas del evento miden lo mismo (regla 5).
 * Se calcula para el peor caso: todas las casillas llenas con nombres
 * externos del largo máximo.
 */
export function nominationBallotBytes(categoryCount: number, maxNominations: number): number {
  const BASE = 128; // {"v":1,"kind":"nomination","receipt":"XXX-XXX","categories":{},"pad":""}
  const PER_CATEGORY = 48; // "<uuid>":[],
  // {"type":"external","name":"…"}, con 40 unidades de texto de hasta 3 bytes
  // cada una en UTF-8, más comillas escapadas: holgadamente bajo 200.
  const PER_NOMINEE = 200;
  const worstCase = BASE + categoryCount * (PER_CATEGORY + maxNominations * PER_NOMINEE);
  return Math.ceil(worstCase / 1024) * 1024;
}

/** Nombre de alguien de fuera del grupo: limpio y sin caracteres invisibles. */
export function cleanExternalName(raw: string): string {
  return cleanDisplayName(raw.replace(/[\p{Cc}\p{Cf}]/gu, "")).slice(0, EXTERNAL_NAME_MAX);
}

/**
 * Agrega un nominado a la lista de una categoría, sin repetir. Si el nombre
 * "de fuera" coincide con alguien del grupo, se guarda como esa persona para
 * que sus nominaciones sumen juntas.
 */
export function addNominee(list: Nominee[], nominee: Nominee, candidates: Candidate[]): Nominee[] {
  let entry = nominee;
  if (entry.type === "external") {
    const name = cleanExternalName(entry.name);
    if (name.length < 2) return list;
    const match = candidates.find((c) => normalizeName(c.name) === normalizeName(name));
    entry = match ? { type: "participant", id: match.id } : { type: "external", name };
  }
  const duplicated = list.some((n) =>
    n.type === "participant" && entry.type === "participant"
      ? n.id === entry.id
      : n.type === "external" && entry.type === "external" && normalizeName(n.name) === normalizeName(entry.name),
  );
  return duplicated ? list : [...list, entry];
}

export interface NominationRules {
  min: number;
  max: number;
  allowSkip: boolean;
}

/** Problemas por categoría (id → mensaje). Sin problemas = se puede enviar. */
export function validateNominations(
  selections: Record<string, Nominee[]>,
  categoryIds: string[],
  rules: NominationRules,
): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const id of categoryIds) {
    const count = selections[id]?.length ?? 0;
    if (count === 0 && rules.allowSkip) continue;
    if (count < rules.min) issues[id] = `Nomina al menos ${rules.min} (llevas ${count}).`;
    else if (count > rules.max) issues[id] = `Nomina como máximo ${rules.max} (llevas ${count}).`;
  }
  if (rules.allowSkip && categoryIds.every((id) => (selections[id]?.length ?? 0) === 0)) {
    issues._all = "Nomina en al menos una categoría.";
  }
  return issues;
}

export function buildNominationBallot(
  selections: Record<string, Nominee[]>,
  categoryIds: string[],
  receipt: string,
): NominationBallot {
  const categories: Record<string, Nominee[]> = {};
  for (const id of categoryIds) {
    if (selections[id]?.length) categories[id] = selections[id];
  }
  return { v: 1, kind: "nomination", receipt, categories };
}

/** Para leer papeletas ya abiertas (cierre de nominaciones, Fase 5). */
export const nominationBallotSchema = z.object({
  v: z.literal(1),
  kind: z.literal("nomination"),
  receipt: z.string(),
  categories: z.record(
    z.string(),
    z.array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("participant"), id: z.string() }),
        z.object({ type: z.literal("external"), name: z.string().max(EXTERNAL_NAME_MAX) }),
      ]),
    ),
  ),
});
