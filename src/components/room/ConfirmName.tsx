"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/initials";

/** Después de tocar un nombre: confirmar que eres tú antes de entrar (evita toques por error). */
export function ConfirmName({
  name,
  pending,
  message,
  formAction,
  onBack,
  hidden,
}: {
  name: string;
  pending: boolean;
  message?: string;
  formAction: (formData: FormData) => void;
  onBack: () => void;
  /** Campos ocultos (sala, nombre). */
  hidden?: ReactNode;
}) {
  return (
    <form action={formAction} className="space-y-5">
      {hidden}
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center bg-sand font-display text-lg font-extrabold chamfer-8">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">Vas a entrar como</p>
          <p className="font-display text-2xl leading-tight font-bold break-words">{name}</p>
        </div>
      </div>
      {message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Entrando…" : "Sí, soy yo"}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onBack} disabled={pending}>
          No, volver
        </Button>
      </div>
    </form>
  );
}
