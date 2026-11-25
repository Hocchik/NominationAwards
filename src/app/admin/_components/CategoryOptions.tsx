"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/initials";
import { resizeToJpeg } from "@/lib/photos";
import {
  addCategoryOptionAction,
  deleteCategoryOptionAction,
  setCategoryOptionPhotoAction,
} from "../category-option-actions";

export interface CategoryOptionValues {
  id: string;
  label: string;
  blurb: string | null;
  photoUrl: string | null;
}

/**
 * Las opciones de una categoría de opciones (profes, eventos, frases): el grupo
 * nomina entre ellas y gana una. Se ven como tarjetas al nominar.
 */
export function CategoryOptions({
  categoryId,
  options,
  canAdd,
  canDelete,
  direct = false,
}: {
  categoryId: string;
  options: CategoryOptionValues[];
  canAdd: boolean;
  canDelete: boolean;
  /** Finalistas directos (Evento del año): las opciones pasan tal cual a la votación. */
  direct?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  function run(task: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      try {
        const result = await task();
        if (!result.ok) setError(result.message ?? "No se pudo guardar.");
        else after?.();
      } catch {
        setError("No se pudo leer esa imagen.");
      }
    });
  }

  async function readPhoto(event: ChangeEvent<HTMLInputElement>): Promise<string | null> {
    const file = event.target.files?.[0];
    event.target.value = "";
    return file ? resizeToJpeg(file) : null;
  }

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <p className="text-sm font-medium">
        Opciones {options.length > 0 && <span className="font-normal text-ink-soft">· {options.length}</span>}
      </p>
      {options.length === 0 && (
        <p className="text-sm text-ink-soft">
          {direct
            ? "Todavía no hay opciones: agrega los eventos antes de que cierren las nominaciones; pasan tal cual a la votación."
            : "Todavía no hay opciones: el grupo no podrá nominar aquí hasta que agregues algunas."}
        </p>
      )}
      <ul className="space-y-2">
        {options.map((option) => (
          <li key={option.id} className="flex items-center gap-3 border border-line bg-sheet p-2">
            <label className={canAdd ? "cursor-pointer" : undefined} title={canAdd ? "Cambiar foto" : undefined}>
              {option.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL pequeña
                <img src={option.photoUrl} alt="" className="size-12 shrink-0 object-cover" />
              ) : (
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center bg-sand font-display text-sm">
                  {initials(option.label)}
                </span>
              )}
              {canAdd && (
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={`Foto de ${option.label}`}
                  onChange={async (e) => {
                    const url = await readPhoto(e);
                    if (url) run(() => setCategoryOptionPhotoAction(option.id, url));
                  }}
                />
              )}
            </label>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{option.label}</span>
              {option.blurb && <span className="block truncate text-xs text-ink-soft">{option.blurb}</span>}
            </span>
            {canDelete && (
              <Button variant="ghost" disabled={pending} onClick={() => run(() => deleteCategoryOptionAction(option.id))} aria-label={`Quitar ${option.label}`}>
                Quitar
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canAdd && (
        <form
          ref={form}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            run(
              () =>
                addCategoryOptionAction({
                  categoryId,
                  label: String(data.get("label") ?? ""),
                  blurb: String(data.get("blurb") ?? ""),
                  photoUrl: photo,
                }),
              () => {
                form.current?.reset();
                setPhoto(null);
              },
            );
          }}
        >
          <label className="text-xs font-medium">
            Opción
            <input name="label" required maxLength={160} placeholder="Un profe, un evento o una frase" className="mt-1 min-h-11 w-full border border-line bg-sheet px-3 text-sm text-ink" />
          </label>
          <label className="text-xs font-medium">
            Detalle (opcional)
            <input name="blurb" maxLength={80} placeholder="El curso, la fecha o quién la dijo" className="mt-1 min-h-11 w-full border border-line bg-sheet px-3 text-sm text-ink" />
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center border border-line bg-sheet px-3 text-sm">
            {photo ? "✓ Foto" : "Foto…"}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => setPhoto(await readPhoto(e))} />
          </label>
          <Button type="submit" disabled={pending}>
            Agregar
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
