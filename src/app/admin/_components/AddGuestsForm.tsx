"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextAreaField } from "@/components/ui/Field";
import { initialFormState } from "@/lib/forms";
import { addGuestsAction } from "../participant-actions";

/** Pegar nombres para la lista de invitados: uno por línea. */
export function AddGuestsForm() {
  const [state, formAction, pending] = useActionState(addGuestsAction, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      <TextAreaField
        id="invitados"
        name="names"
        label="Nombres, uno por línea"
        hint="Puedes pegar la lista del grupo de WhatsApp. Los que ya están se saltan solos."
        rows={6}
        defaultValue={state.ok ? "" : state.values?.names}
        key={state.ok ? state.message : "editando"}
        errors={state.errors?.names}
        placeholder={"Ana Torres\nBruno Díaz\nCamila Rojas"}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar a la lista"}
      </Button>
    </form>
  );
}
