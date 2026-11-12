"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { type FormState, initialFormState } from "@/lib/forms";
import { createNotaryLinkAction } from "../actions";
import { CopyButton } from "@/components/ui/CopyButton";

type LinkState = FormState & { link?: string };

export function NotaryLinkForm({ hasPendingLink }: { hasPendingLink: boolean }) {
  const [state, formAction, pending] = useActionState<LinkState>(
    createNotaryLinkAction,
    initialFormState,
  );

  if (state.link) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Envíale este link <strong>solo al notario</strong>, por un chat privado. Funciona una
          sola vez y no se vuelve a mostrar.
        </p>
        <p className="glass rounded-xl px-4 py-3 text-sm break-all">{state.link}</p>
        <CopyButton text={state.link} />
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {hasPendingLink && (
        <p className="text-sm text-muted">
          Ya generaste un link que el notario aún no usó. Si se perdió, genera otro: el anterior
          deja de funcionar.
        </p>
      )}
      <FormMessage state={state} />
      <Button type="submit" variant={hasPendingLink ? "secondary" : "primary"} disabled={pending}>
        {pending ? "Generando…" : hasPendingLink ? "Generar otro link" : "Generar link para el notario"}
      </Button>
    </form>
  );
}
