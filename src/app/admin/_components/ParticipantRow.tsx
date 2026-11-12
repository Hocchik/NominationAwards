"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { ParticipantStatus } from "@/generated/prisma/enums";
import {
  approveParticipantAction,
  deleteParticipantAction,
  rejectParticipantAction,
  resetPinAction,
} from "../participant-actions";

export interface ParticipantRowData {
  id: string;
  displayName: string;
  status: ParticipantStatus;
  hasNominated: boolean;
  hasVoted: boolean;
  pinReset: boolean;
  locked: boolean;
}

type Confirming = null | "reject" | "reset" | "delete";

const CONFIRM_TEXT: Record<Exclude<Confirming, null>, (name: string) => string> = {
  reject: (n) => `¿Rechazar a ${n}? No podrá nominar ni votar.`,
  reset: (n) => `¿Restablecer el PIN de ${n}? Al entrar creará uno nuevo; tú no lo verás.`,
  delete: (n) => `¿Eliminar el registro de ${n}? Su nombre queda libre para registrarse otra vez.`,
};

const ACTIONS = {
  reject: rejectParticipantAction,
  reset: resetPinAction,
  delete: deleteParticipantAction,
};

export function ParticipantRow({ p, editable }: { p: ParticipantRowData; editable: boolean }) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  const participated = p.hasNominated || p.hasVoted;

  return (
    <li className="space-y-3 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{p.displayName}</span>
        {p.pinReset && <Chip size="sm" tone="neutral">PIN restablecido</Chip>}
        {p.locked && <Chip size="sm" tone="neutral">Bloqueado 15 min</Chip>}
        {p.status === "APPROVED" && (
          <span className="ml-auto flex gap-4 text-sm text-muted">
            <span>{p.hasNominated ? "✔" : "⏳"} Nominó</span>
            <span>{p.hasVoted ? "✔" : "⏳"} Votó</span>
          </span>
        )}
      </div>

      {editable &&
        (confirming ? (
          <form
            action={async (formData) => {
              await ACTIONS[confirming](formData);
              setConfirming(null);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={p.id} />
            <span className="text-sm">{CONFIRM_TEXT[confirming](p.displayName)}</span>
            <Button type="submit" variant={confirming === "reset" ? "secondary" : "danger"}>
              Sí
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.status !== "APPROVED" && (
              <form action={approveParticipantAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit">Aprobar</Button>
              </form>
            )}
            {p.status !== "REJECTED" && !participated && (
              <Button variant="secondary" onClick={() => setConfirming("reject")}>
                Rechazar
              </Button>
            )}
            {p.status === "APPROVED" && !p.hasVoted && !p.pinReset && (
              <Button variant="ghost" onClick={() => setConfirming("reset")}>
                Restablecer PIN
              </Button>
            )}
            {!participated && (
              <Button variant="ghost" onClick={() => setConfirming("delete")}>
                Eliminar
              </Button>
            )}
          </div>
        ))}
    </li>
  );
}
