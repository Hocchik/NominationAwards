"use client";

import { type BoardCategory, NomineesShow } from "@/components/nominees/NomineesShow";
import { DEMO_ALIASES, DEMO_CATEGORIES, byName } from "@/lib/demo/fixtures";
import type { GroupPhotoView } from "@/lib/event/groupPhotos";
import { useDemo } from "../DemoProvider";

// Finalistas en orden alfabético y sin conteos, como la página real (regla 8).
const board: BoardCategory[] = DEMO_CATEGORIES.map((c, i) => ({
  id: c.id,
  num: String(i + 1).padStart(2, "0"),
  name: c.name,
  description: c.description,
  type: c.type,
  finalists: byName(c.finalists).map((f) => ({
    id: f.id,
    name: f.name,
    photoUrl: null,
    nickname: (f.participantId && DEMO_ALIASES[f.participantId]?.[0]) || null,
    external: f.participantId === null,
  })),
}));
const totalFinalists = board.reduce((sum, c) => sum + c.finalists.length, 0);

// En el evento real el organizador sube tres fotos del grupo; aquí van marcadores.
const SAMPLE_PHOTOS: GroupPhotoView[] = [
  { photoUrl: null, caption: "Aquí va una foto del grupo" },
  { photoUrl: null, caption: "Otra foto del año" },
  { photoUrl: null, caption: "Y una más" },
];

export function DemoNominees() {
  const { votingOpensAt } = useDemo();
  return (
    <NomineesShow
      eyebrow="Pronto la votación final"
      subline={`${totalFinalists} nominados en ${board.length} categorías, en orden alfabético y sin conteos. En el evento real salen de lo que nominó el grupo; aquí son de ejemplo.`}
      revealed
      categories={board}
      slots={4}
      revealNote="Se revela pronto"
      groupPhotos={SAMPLE_PHOTOS}
      countdown={votingOpensAt ? { title: "La votación abre en", target: votingOpensAt } : null}
      vote={{ href: "/demo/votar", label: "Votar →", loadingLabel: "Preparando tu papeleta…" }}
      closing={{ lead: `${totalFinalists} nominados en ${board.length} categorías.`, em: "Ahora te toca", tail: "elegir al ganador." }}
    />
  );
}
