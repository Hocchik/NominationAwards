import type { NomineeKind } from "@/generated/prisma/enums";

// Cómo se muestra un finalista en Nominados, Votar y la ceremonia: su foto (la
// del finalista o, si no tiene, la del invitado), el apodo y, en las parejas,
// las dos fotos y «Gabo y Lu». Puro: el servidor le pasa los invitados.

export type FinalistKind = "person" | "pair" | "option";

export interface GuestInfo {
  displayName: string;
  aliases: string[];
  photoUrl: string | null;
}

export interface FinalistRow {
  displayName: string;
  participantId: string | null;
  partnerParticipantId?: string | null;
  optionId?: string | null;
  photoUrl: string | null;
  blurb?: string | null;
}

export interface FinalistDisplay {
  kind: FinalistKind;
  photoUrl: string | null;
  /** La foto de la otra mitad (solo parejas). */
  partnerPhotoUrl: string | null;
  /** Apodo para «¡Felicidades, Gabo!»; en parejas, «Gabo y Lu». */
  nickname: string | null;
  /** Referente de fuera del grupo (ni invitado ni opción). */
  external: boolean;
}

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

export function kindOf(nomineeKind: NomineeKind | undefined): FinalistKind {
  return nomineeKind === "PAIR" ? "pair" : nomineeKind === "OPTION" ? "option" : "person";
}

export function finalistDisplay(f: FinalistRow, guests: Map<string, GuestInfo>, nomineeKind?: NomineeKind): FinalistDisplay {
  const a = f.participantId ? guests.get(f.participantId) : undefined;
  if (f.partnerParticipantId) {
    const b = guests.get(f.partnerParticipantId);
    const short = (g: GuestInfo | undefined) => (g ? (g.aliases[0] ?? firstName(g.displayName)) : null);
    const both = [short(a), short(b)].filter(Boolean);
    return {
      kind: "pair",
      photoUrl: f.photoUrl ?? a?.photoUrl ?? null,
      partnerPhotoUrl: b?.photoUrl ?? null,
      nickname: both.length === 2 ? both.join(" y ") : null,
      external: false,
    };
  }
  // Opciones del organizador y textos libres (frases, profes): sin apodo ni «de fuera».
  if (f.optionId || nomineeKind === "TEXT" || nomineeKind === "DIRECT") {
    return { kind: "option", photoUrl: f.photoUrl, partnerPhotoUrl: null, nickname: null, external: false };
  }
  return {
    kind: "person",
    photoUrl: f.photoUrl ?? a?.photoUrl ?? null,
    partnerPhotoUrl: null,
    nickname: a?.aliases[0] ?? null,
    external: f.participantId === null,
  };
}

/** Los invitados que aparecen como finalistas (para buscar sus fotos y apodos). */
export function finalistGuestIds(categories: { finalists: FinalistRow[] }[]): string[] {
  return [
    ...new Set(
      categories.flatMap((c) =>
        c.finalists.flatMap((f) => [f.participantId, f.partnerParticipantId].filter((id): id is string => Boolean(id))),
      ),
    ),
  ];
}
