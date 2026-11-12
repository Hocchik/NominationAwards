"use client";

import { type ChangeEvent, useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/initials";
import { setFinalistPhotoAction, updateFinalistBlurbAction } from "../../finalist-actions";

// La foto se reduce en el navegador (máx. 480 px, JPEG) antes de enviarla:
// así pesa unas decenas de KB y cabe en la base sin servicios extra.
const MAX_SIDE = 480;

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

export interface FinalistCardData {
  id: string;
  displayName: string;
  external: boolean;
  photoUrl: string | null;
  blurb: string | null;
}

export function FinalistCard({ finalist, editable }: { finalist: FinalistCardData; editable: boolean }) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPending, startPhoto] = useTransition();
  const [state, formAction, pending] = useActionState(updateFinalistBlurbAction, { ok: false });

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError(null);
    startPhoto(async () => {
      try {
        const result = await setFinalistPhotoAction(finalist.id, await resizeToJpeg(file));
        if (!result.ok) setPhotoError(result.message ?? "No se pudo guardar la foto.");
      } catch {
        setPhotoError("No se pudo leer esa imagen.");
      }
    });
  }

  return (
    <li className="glass space-y-3 rounded-card p-4">
      <div className="flex items-center gap-3">
        {finalist.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL pequeña, sin optimización que hacer
          <img src={finalist.photoUrl} alt={`Foto de ${finalist.displayName}`} className="size-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface-strong font-display text-xl">
            {initials(finalist.displayName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold">{finalist.displayName}</p>
          <p className="text-xs text-muted">{finalist.external ? "De fuera del grupo" : "Del grupo"}</p>
        </div>
      </div>

      {editable && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-3 text-sm">
              {photoPending ? "Subiendo…" : finalist.photoUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" onChange={pickPhoto} disabled={photoPending} className="sr-only" />
            </label>
            {finalist.photoUrl && (
              <Button
                variant="ghost"
                onClick={() => startPhoto(async () => void (await setFinalistPhotoAction(finalist.id, null)))}
                disabled={photoPending}
              >
                Quitar foto
              </Button>
            )}
          </div>
          {photoError && <p className="text-sm text-danger">{photoError}</p>}

          <form action={formAction} className="space-y-2">
            <input type="hidden" name="id" value={finalist.id} />
            <label htmlFor={`frase-${finalist.id}`} className="block text-sm text-muted">
              Frase corta (opcional)
            </label>
            <div className="flex gap-2">
              <input
                id={`frase-${finalist.id}`}
                name="blurb"
                defaultValue={finalist.blurb ?? ""}
                maxLength={120}
                placeholder="«Llega con parlante propio.»"
                className="glass min-h-11 min-w-0 flex-1 rounded-xl px-3 text-sm text-foreground"
              />
              <Button type="submit" variant="secondary" disabled={pending}>
                {pending ? "…" : "Guardar"}
              </Button>
            </div>
            {state.message && (
              <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>
                {state.message}
              </p>
            )}
          </form>
        </>
      )}
      {!editable && finalist.blurb && <p className="text-sm text-muted italic">«{finalist.blurb}»</p>}
    </li>
  );
}
