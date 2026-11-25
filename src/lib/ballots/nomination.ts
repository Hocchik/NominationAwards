import { z } from "zod";
import type { NomineeKind } from "@/generated/prisma/enums";
import { cleanDisplayName, normalizeName } from "@/lib/participants/names";

// Papeleta de nominación (CLAUDE.md §6). Todo lo de este archivo es puro: se
// usa en el navegador al armar la papeleta y en el cierre para leerla.

export type Nominee =
  | { type: "participant"; id: string }
  | { type: "external"; name: string }
  /** Dos invitados juntos (shipeo, dúo): los ids van ordenados, así A+B = B+A. */
  | { type: "pair"; ids: [string, string] }
  /** Una de las opciones que cargó el organizador. */
  | { type: "option"; id: string }
  /** Texto libre (una frase, el nombre de un profe): al cierre se juntan las variantes y pasan los más escritos. */
  | { type: "text"; text: string };

export interface NominationBallot {
  v: 1;
  kind: "nomination";
  categories: Record<string, Nominee[]>;
}

export interface Candidate {
  id: string;
  name: string;
  /** Apodos y otros nombres para buscar (segundo nombre, apellidos…). */
  aliases?: string[];
  photoUrl?: string | null;
}

/** Lo que define cómo se nomina en una categoría (y cuánto puede medir su papeleta). */
export interface NominationCategory {
  id: string;
  nomineeKind: NomineeKind;
  /** Cuántos nombres, parejas u opciones pone cada persona. */
  maxPicks: number;
  /** Mínimo obligatorio (0 = se puede dejar vacía). */
  minPicks?: number;
  allowExternal: boolean;
}

export const EXTERNAL_NAME_MAX = 40;
/** Largo máximo de un texto libre (una frase o el nombre de un profe). */
export const TEXT_MAX = 140;

/** Lo que mide en el peor caso un nominado dentro del JSON, según la categoría. */
function nomineeWorstCase(category: Omit<NominationCategory, "id">): number {
  // {"type":"text","text":"…"}, con 140 unidades de hasta 3 bytes cada una.
  if (category.nomineeKind === "TEXT") return 480;
  // {"type":"external","name":"…"}, con 40 unidades de texto de hasta 3 bytes
  // cada una en UTF-8, más comillas escapadas: holgadamente bajo 200.
  if (category.nomineeKind === "PERSON" && category.allowExternal) return 200;
  // {"type":"pair","ids":["<uuid>","<uuid>"]},
  if (category.nomineeKind === "PAIR") return 110;
  // {"type":"participant","id":"<uuid>"}, o {"type":"option","id":"<uuid>"},
  return 80;
}

/**
 * Tamaño fijo (en bytes) de las papeletas de un evento. Depende de cómo se
 * nomina en cada categoría, que se congela al abrir las nominaciones: todas
 * las papeletas del evento miden lo mismo (regla 5). Se calcula para el peor
 * caso: todas las casillas llenas con lo más largo que permite cada categoría.
 */
export function nominationBallotBytes(categories: Omit<NominationCategory, "id">[]): number {
  const BASE = 128; // {"v":1,"kind":"nomination","categories":{},"pad":""}, con holgura
  const PER_CATEGORY = 48; // "<uuid>":[],
  // Las categorías de finalistas directos no se nominan: no ocupan lugar.
  const worstCase = categories
    .filter((c) => c.nomineeKind !== "DIRECT")
    .reduce((sum, c) => sum + PER_CATEGORY + Math.max(1, c.maxPicks) * nomineeWorstCase(c), BASE);
  return Math.ceil(worstCase / 1024) * 1024;
}

/** Nombre de alguien de fuera del grupo: limpio y sin caracteres invisibles. */
export function cleanExternalName(raw: string): string {
  return cleanDisplayName(raw.replace(/[\p{Cc}\p{Cf}]/gu, "")).slice(0, EXTERNAL_NAME_MAX);
}

/** Texto libre limpio: sin caracteres invisibles, espacios simples y recortado. */
export function cleanText(raw: string): string {
  return raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, TEXT_MAX);
}

/** Arma una pareja con los ids ordenados (A+B y B+A cuentan como la misma). */
export function makePair(a: string, b: string): Nominee {
  return { type: "pair", ids: a < b ? [a, b] : [b, a] };
}

function sameNominee(a: Nominee, b: Nominee): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "participant" && b.type === "participant") return a.id === b.id;
  if (a.type === "option" && b.type === "option") return a.id === b.id;
  if (a.type === "pair" && b.type === "pair") return a.ids[0] === b.ids[0] && a.ids[1] === b.ids[1];
  if (a.type === "text" && b.type === "text") return normalizeName(a.text) === normalizeName(b.text);
  return a.type === "external" && b.type === "external" && normalizeName(a.name) === normalizeName(b.name);
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
  if (entry.type === "text") {
    const text = cleanText(entry.text);
    if (text.length < 2) return list;
    entry = { type: "text", text };
  }
  if (entry.type === "pair") {
    if (entry.ids[0] === entry.ids[1]) return list;
    entry = makePair(entry.ids[0], entry.ids[1]);
  }
  return list.some((n) => sameNominee(n, entry)) ? list : [...list, entry];
}

/** Problemas por categoría (id → mensaje). Sin problemas = se puede enviar. */
export function validateNominations(
  selections: Record<string, Nominee[]>,
  categories: Pick<NominationCategory, "id" | "maxPicks" | "minPicks">[],
  allowSkip: boolean,
): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const { id, maxPicks, minPicks = 0 } of categories) {
    const count = selections[id]?.length ?? 0;
    const min = Math.max(minPicks, allowSkip ? 0 : 1);
    if (count < min) issues[id] = min === 1 ? "Esta es obligatoria: pon al menos uno." : `Pon al menos ${min} (llevas ${count}).`;
    else if (count > maxPicks) issues[id] = `Puedes poner hasta ${maxPicks} (llevas ${count}).`;
  }
  if (allowSkip && categories.every(({ id }) => (selections[id]?.length ?? 0) === 0)) {
    issues._all = "Nomina en al menos una categoría.";
  }
  return issues;
}

export function buildNominationBallot(
  selections: Record<string, Nominee[]>,
  categoryIds: string[],
): NominationBallot {
  const categories: Record<string, Nominee[]> = {};
  for (const id of categoryIds) {
    if (selections[id]?.length) categories[id] = selections[id];
  }
  return { v: 1, kind: "nomination", categories };
}

/** Para leer papeletas ya abiertas (cierre de nominaciones, Fase 5). */
export const nominationBallotSchema = z.object({
  v: z.literal(1),
  kind: z.literal("nomination"),
  categories: z.record(
    z.string(),
    z.array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("participant"), id: z.string() }),
        z.object({ type: z.literal("external"), name: z.string().max(EXTERNAL_NAME_MAX) }),
        z.object({ type: z.literal("pair"), ids: z.tuple([z.string(), z.string()]) }),
        z.object({ type: z.literal("option"), id: z.string() }),
        z.object({ type: z.literal("text"), text: z.string().max(TEXT_MAX) }),
      ]),
    ),
  ),
});
