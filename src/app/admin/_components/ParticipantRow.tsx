"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { BallotPhase } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { removeGuestAction, resetBallotAction } from "../participant-actions";

export interface ParticipantRowData {
  id: string;
  displayName: string;
  hasNominated: boolean;
  hasVoted: boolean;
}

type Confirming = null | "reset" | "remove";

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
        <span className="font-semibold">{p.displayName}</span>
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

      {editable &&
        (confirming ? (
          <form
            action={async (formData) => {
              await (confirming === "reset" ? resetBallotAction : removeGuestAction)(formData);
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
            <Button variant="ghost" onClick={() => setConfirming("remove")}>
              Quitar de la lista
            </Button>
          </div>
        ))}
    </li>
  );
}
