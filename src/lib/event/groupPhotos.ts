// Fotos grupales de la entrada de Nominados: recuerdos del grupo que sube el
// organizador (no tocan nominaciones ni votos).

/** Cuántas fotos grupales hay como máximo (pasan como diapositivas). */
export const GROUP_PHOTO_SLOTS = 3;

export interface GroupPhotoView {
  photoUrl: string | null;
  caption: string;
}

/** Siempre tres lugares, en orden: los vacíos se muestran como marcador. */
export function groupPhotoSlots(saved: { slot: number; photoUrl: string; caption: string }[]): GroupPhotoView[] {
  return Array.from({ length: GROUP_PHOTO_SLOTS }, (_, slot) => {
    const photo = saved.find((p) => p.slot === slot);
    return { photoUrl: photo?.photoUrl ?? null, caption: photo?.caption ?? "" };
  });
}
