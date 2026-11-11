"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { initialFormState } from "@/lib/forms";
import { createEventAction } from "../actions";

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEventAction, initialFormState);
  return (
    <form action={formAction} className="space-y-5">
      <TextField
        name="name"
        label="Nombre del evento"
        placeholder="Premios del Grupo 2026"
        defaultValue={state.values?.name}
        required
        maxLength={80}
        errors={state.errors?.name}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear evento"}
      </Button>
    </form>
  );
}
