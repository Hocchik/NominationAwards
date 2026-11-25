"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RESET_WORD, WIPE_WORD, confirmsWith } from "@/lib/event/reset";
import { type ResetState, resetEventAction, wipeEventAction } from "../reset-actions";

/** Reiniciar el evento o empezar desde cero; cada uno pide escribir una palabra. */
export function DangerZone() {
  return (
    <div className="space-y-6">
      <ResetForm
        title="Reiniciar evento"
        word={RESET_WORD}
        action={resetEventAction}
        text="Vuelve a Preparación. Borra sin abrir todas las nominaciones y votos, los finalistas, quién ya participó y las llaves del notario (habrá que generar nuevas). Conserva las categorías y su orden, los invitados con sus fotos, los horarios y las fotos grupales."
      />
      <ResetForm
        title="Empezar desde cero"
        word={WIPE_WORD}
        action={wipeEventAction}
        text="Borra todo: papeletas, finalistas, llaves, categorías, invitados, horarios y fotos grupales. Solo quedan el nombre y los ajustes del evento. No se puede deshacer."
      />
    </div>
  );
}

function ResetForm({
  title,
  word,
  text,
  action,
}: {
  title: string;
  word: string;
  text: string;
  action: (prev: ResetState, formData: FormData) => Promise<ResetState>;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [typed, setTyped] = useState("");
  return (
    <form action={formAction} className="space-y-3 border border-danger/60 p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ink-soft">{text}</p>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">
          Escribe <span className="font-display">{word}</span> para confirmar
        </span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="min-h-12 w-full border border-line-strong bg-raised px-4 text-base text-ink sm:w-80"
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending || !confirmsWith(typed, word)}>
        {pending ? "Borrando…" : title}
      </Button>
      {state.message && (
        <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
