"use client";

import { useActionState, useState } from "react";
import { ConfirmName } from "@/components/room/ConfirmName";
import { NameGrid } from "@/components/room/NameGrid";
import { type FormState, initialFormState } from "@/lib/forms";
import type { GuestEntry } from "@/lib/participants/guests";
import { enterAction } from "./actions";
import type { EntryTarget } from "./entryTarget";

/** Entrar a la sala: tocas tu nombre de la lista, confirmas que eres tú y sigues a `next`. */
export function EntryFlow({ next, guests }: { next: EntryTarget; guests: GuestEntry[] }) {
  const [name, setName] = useState<string | null>(null);

  if (guests.length === 0) {
    return <p className="text-sm text-ink-soft">El organizador todavía no carga la lista de invitados.</p>;
  }
  if (name === null) return <NameGrid guests={guests} onPick={setName} />;
  // key: al cambiar de nombre, la confirmación empieza de cero.
  return <Confirm key={name} next={next} name={name} onBack={() => setName(null)} />;
}

function Confirm({ next, name, onBack }: { next: EntryTarget; name: string; onBack: () => void }) {
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
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="name" value={name} />
        </>
      }
    />
  );
}
