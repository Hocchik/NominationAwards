"use client";

import { useActionState, useState } from "react";
import { ConfirmName } from "@/components/room/ConfirmName";
import { NameGrid } from "@/components/room/NameGrid";
import { type FormState, initialFormState } from "@/lib/forms";
import { enterAction } from "./actions";

/** Entrar a la sala: tocas tu nombre de la lista, confirmas que eres tú y listo. */
export function EntryFlow({ roomCode, names }: { roomCode: string; names: string[] }) {
  const [name, setName] = useState<string | null>(null);

  if (names.length === 0) {
    return <p className="text-sm text-ink-soft">El organizador todavía no carga la lista de invitados.</p>;
  }
  if (name === null) return <NameGrid names={names} onPick={setName} />;
  // key: al cambiar de nombre, la confirmación empieza de cero.
  return <Confirm key={name} roomCode={roomCode} name={name} onBack={() => setName(null)} />;
}

function Confirm({ roomCode, name, onBack }: { roomCode: string; name: string; onBack: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(enterAction, initialFormState);
  return (
    <ConfirmName
      name={name}
      pending={pending}
      message={state.ok ? undefined : state.message}
      formAction={formAction}
      onBack={onBack}
      hidden={
        <>
          <input type="hidden" name="roomCode" value={roomCode} />
          <input type="hidden" name="name" value={name} />
        </>
      }
    />
  );
}
