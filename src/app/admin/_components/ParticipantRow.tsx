"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { BallotPhase } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";
import { resizeToJpeg } from "@/lib/photos";
import { removeGuestAction, resetBallotAction, setAliasesAction, setGuestPhotoAction } from "../participant-actions";

export interface ParticipantRowData {
  id: string;
  displayName: string;
  aliases: string[];
  searchNames: string[];
  photoUrl: string | null;
  hasNominated: boolean;
  hasVoted: boolean;
}

type Confirming = null | "reset" | "remove" | "aliases";

const PHASE_WORD: Record<BallotPhase, { noun: string; verb: string }> = {
  NOMINATION: { noun: "nominación", verb: "nominar" },
  VOTE: { noun: "voto", verb: "votar" },
};

/**
 * Un nombre de la lista. «Bloqueado» = ya envió en la urna abierta: solo lo ve
 * el admin (en la sala todos los nombres se ven iguales).
 */
export function ParticipantRow({
  p,
  openUrn,
  editable,
}: {
  p: ParticipantRowData;
  /** Urna abierta ahora (se puede resetear un envío en ella), o null. */
  openUrn: BallotPhase | null;
  editable: boolean;
}) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoPending, startPhoto] = useTransition();

  function savePhoto(url: string | null) {
    setError(null);
    startPhoto(async () => {
      const result = await setGuestPhotoAction(p.id, url);
      if (!result.ok) setError(result.message ?? "No se pudo guardar la foto.");
    });
  }
  const sentInOpenUrn = openUrn === "NOMINATION" ? p.hasNominated : openUrn === "VOTE" ? p.hasVoted : false;
  const words = openUrn ? PHASE_WORD[openUrn] : null;

  const confirmText =
    confirming === "reset" && words
      ? words.noun === "voto"
        ? `¿Botar el voto de ${p.displayName} sin abrirlo? Podrá votar de nuevo desde la sala.`
        : `¿Botar la nominación de ${p.displayName} sin abrirla? Podrá nominar de nuevo desde la sala.`
      : `¿Quitar a ${p.displayName} de la lista?${sentInOpenUrn && words ? ` Su ${words.noun} también se bota.` : ""}`;

  return (
    <li className="space-y-3 border-b border-line py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* Foto: se puede subir cuando quieras; se usa en todas las pantallas */}
        <label className={cn("relative shrink-0 cursor-pointer", photoPending && "opacity-50")} title={p.photoUrl ? "Cambiar foto" : "Subir foto"}>
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL pequeña
            <img src={p.photoUrl} alt="" className="size-11 object-cover chamfer-6" />
          ) : (
            <span aria-hidden="true" className="grid size-11 place-items-center border border-dashed border-line-strong bg-sand font-display text-xs chamfer-6">
              {initials(p.displayName)}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Foto de ${p.displayName}`}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                savePhoto(await resizeToJpeg(file));
              } catch {
                setError("No se pudo leer esa imagen.");
              }
            }}
          />
        </label>
        <span className="font-semibold">
          {p.displayName}
          {p.aliases.length > 0 && (
            <span className="font-normal text-ink-soft"> · {p.aliases.length === 1 ? "apodo" : "apodos"} «{p.aliases.join("», «")}»</span>
          )}
          {p.searchNames.length > 0 && (
            <span className="block text-xs font-normal text-ink-soft">También lo encuentran por: {p.searchNames.join(", ")}</span>
          )}
        </span>
        {p.photoUrl && (
          <button type="button" onClick={() => savePhoto(null)} className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink">
            Quitar foto
          </button>
        )}
        {sentInOpenUrn && words && (
          <span className="bg-ink px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.12em] text-sheet uppercase">
            Bloqueado · ya {words.noun === "voto" ? "votó" : "nominó"}
          </span>
        )}
        <span className="ml-auto flex gap-4 text-sm text-ink-soft">
          <span className={cn(p.hasNominated && "text-ink")}>{p.hasNominated ? "✔" : "⏳"} Nominó</span>
          <span className={cn(p.hasVoted && "text-ink")}>{p.hasVoted ? "✔" : "⏳"} Votó</span>
        </span>
      </div>

      {editable && confirming === "aliases" && (
        <form
          action={async (formData) => {
            await setAliasesAction(formData);
            setConfirming(null);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={p.id} />
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="block font-semibold">Apodos de {p.displayName} (el primero es el que se ve)</span>
            <input
              name="aliases"
              defaultValue={p.aliases.join(", ")}
              placeholder="Gabo, Gabito"
              autoFocus
              className="min-h-12 w-full border border-line-strong bg-raised px-4 text-base text-ink placeholder:text-ink-soft"
            />
          </label>
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="block font-semibold">Otros nombres para buscar (no se muestran)</span>
            <input
              name="searchNames"
              defaultValue={p.searchNames.join(", ")}
              placeholder="Segundo nombre, apellidos"
              className="min-h-12 w-full border border-line-strong bg-raised px-4 text-base text-ink placeholder:text-ink-soft"
            />
          </label>
          <Button type="submit">Guardar</Button>
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Cancelar
          </Button>
        </form>
      )}

      {editable &&
        confirming !== "aliases" &&
        (confirming ? (
          <form
            action={async (formData) => {
              if (confirming === "reset") {
                const result = await resetBallotAction(formData);
                setError(result.ok ? null : (result.message ?? "No se pudo resetear."));
              } else {
                await removeGuestAction(formData);
              }
              setConfirming(null);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={p.id} />
            {openUrn && <input type="hidden" name="phase" value={openUrn} />}
            <span className="text-sm">{confirmText}</span>
            <Button type="submit" variant="danger">
              Sí
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sentInOpenUrn && words && (
              <Button variant="secondary" onClick={() => setConfirming("reset")}>
                Resetear {words.noun}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirming("aliases")}>
              Editar apodos y nombres
            </Button>
            <Button variant="ghost" onClick={() => setConfirming("remove")}>
              Quitar de la lista
            </Button>
          </div>
        ))}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
