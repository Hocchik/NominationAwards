"use client";

import { type ChangeEvent, type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { removeGroupPhotoAction, setGroupPhotoAction, setGroupPhotoCaptionAction } from "../group-photo-actions";

// Las fotos se reducen en el navegador (máx. 1600 px, JPEG) antes de enviarlas:
// se ven a pantalla completa en Nominados, pero pesan unos cientos de KB.
const MAX_SIDE = 1600;

async function resizeToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export interface GroupPhotoSlot {
  slot: number;
  photoUrl: string | null;
  caption: string;
}

/** Los tres lugares de fotos grupales de la entrada de Nominados. */
export function GroupPhotosForm({ photos }: { photos: GroupPhotoSlot[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Tres fotos del grupo para la entrada de la página de Nominados: aparecen en abanico y pasan una por una a pantalla
        completa. Mejor horizontales. Se ven en duotono, así que fotos de distinta calidad quedan parejas.
      </p>
      <ol className="grid gap-4 sm:grid-cols-3">
        {photos.map((p) => (
          <SlotCard key={p.slot} photo={p} />
        ))}
      </ol>
    </div>
  );
}

function SlotCard({ photo }: { photo: GroupPhotoSlot }) {
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [caption, setCaption] = useState(photo.caption);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setNote(null);
    start(async () => {
      try {
        const result = await setGroupPhotoAction(photo.slot, await resizeToJpeg(file));
        if (!result.ok) setError(result.message ?? "No se pudo guardar la foto.");
      } catch {
        setError("No se pudo leer esa imagen.");
      }
    });
  }

  function saveCaption(event: FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await setGroupPhotoCaptionAction(photo.slot, caption);
      if (result.ok) setNote(result.message ?? "Guardado.");
      else setError(result.message ?? "No se pudo guardar.");
    });
  }

  return (
    <li className="space-y-3 border border-line bg-sheet p-3">
      <p className="font-display text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">Foto {photo.slot + 1}</p>
      {photo.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL guardada en la base
        <img src={photo.photoUrl} alt={`Foto grupal ${photo.slot + 1}`} className="aspect-[3/2] w-full object-cover" />
      ) : (
        <div className="grid aspect-[3/2] w-full place-items-center bg-sand text-sm text-ink-soft">Sin foto</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center border border-line px-3 text-sm">
          {pending ? "Guardando…" : photo.photoUrl ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" onChange={pick} disabled={pending} className="sr-only" />
        </label>
        {photo.photoUrl && (
          <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await removeGroupPhotoAction(photo.slot)))}>
            Quitar
          </Button>
        )}
      </div>
      {photo.photoUrl && (
        <form onSubmit={saveCaption} className="space-y-2">
          <label htmlFor={`pie-${photo.slot}`} className="block text-sm text-ink-soft">
            Pie de foto (opcional)
          </label>
          <input
            id={`pie-${photo.slot}`}
            value={caption}
            maxLength={50}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Año nuevo · 2026"
            className="min-h-11 w-full border border-line bg-raised px-3 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={pending}>
            Guardar pie
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {note && !error && <p className="text-sm text-success">{note}</p>}
    </li>
  );
}
