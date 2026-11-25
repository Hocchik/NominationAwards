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
        hint="Nombre y apellido; apodos entre paréntesis (el primero es el que se ve) y, entre corchetes, otros nombres solo para buscar: «Gabriel Mendoza (Gabo) [Armando, Salcedo]». Si el nombre ya está, solo se le suman los nuevos."
        rows={6}
        defaultValue={state.ok ? "" : state.values?.names}
        key={state.ok ? state.message : "editando"}
        errors={state.errors?.names}
        placeholder={"Gabriel Mendoza (Gabo)\nAna Torres\nBruno Díaz (Brunito)"}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar a la lista"}
      </Button>
    </form>
  );
}
