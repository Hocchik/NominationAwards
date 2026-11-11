"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { initialFormState } from "@/lib/forms";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialFormState);
  return (
    <form action={formAction} className="space-y-5">
      <TextField
        name="password"
        type="password"
        label="Contraseña del organizador"
        autoComplete="current-password"
        required
        autoFocus
      />
      <FormMessage state={state} />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
