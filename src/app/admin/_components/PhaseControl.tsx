"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import type { EventPhase } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import {
  ADVANCE_MODE,
  PHASES,
  PHASE_HINTS,
  PHASE_LABELS,
  nextPhase,
  phaseIndex,
} from "@/lib/event/phases";
import { type FormState, initialFormState } from "@/lib/forms";
import { advancePhaseAction } from "../actions";

interface PhaseControlProps {
  phase: EventPhase;
  /** Lo que falta para avanzar (calculado en el servidor). */
  blockers: string[];
}

export function PhaseControl({ phase, blockers }: PhaseControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await advancePhaseAction(prev, formData);
      if (result.ok) setConfirming(false);
      return result;
    },
    initialFormState,
  );

  const current = phaseIndex(phase);
  const next = nextPhase(phase);
  const mode = ADVANCE_MODE[phase];

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PHASES.map((p, i) => (
          <li
            key={p}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "border px-3 py-2 text-sm",
              i < current && "border-line text-ink-soft line-through decoration-ink-soft/50",
              i === current && "border-ink bg-ink font-semibold text-sheet [&_span]:text-sheet/75",
              i > current && "border-line/60 text-ink-soft",
            )}
          >
            <span className="block text-xs font-normal text-ink-soft no-underline">{i + 1}</span>
            {PHASE_LABELS[p]}
          </li>
        ))}
      </ol>

      <div className="space-y-1">
        <p className="font-display text-xl font-semibold">Ahora: {PHASE_LABELS[phase]}</p>
        <p className="text-sm text-ink-soft">{PHASE_HINTS[phase]}</p>
      </div>

      {mode === "flow" && (
        <p className="text-sm text-ink-soft">
          Esta fase termina en{" "}
          <Link href="/admin/cierre-nominaciones" className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4">
            Cierre de nominaciones
          </Link>
          : el notario abre las papeletas en su navegador y, al guardar los finalistas, el evento
          pasa solo a «Finalistas listos».
        </p>
      )}
      {mode === "end" && <p className="text-sm text-ink-soft">El evento terminó.</p>}

      {mode === "button" && next && (
        <div className="space-y-4">
          {blockers.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Para avanzar falta:</p>
              <ul className="list-disc space-y-1 pl-5 text-ink-soft">
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          {confirming ? (
            <form action={formAction} className="space-y-4 border-[1.5px] border-ink bg-raised p-4">
              <input type="hidden" name="from" value={phase} />
              <p className="text-sm">
                ¿Pasar a <strong>«{PHASE_LABELS[next]}»</strong>? {PHASE_HINTS[next]}{" "}
                <strong>No se puede volver atrás.</strong>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Avanzando…" : "Sí, avanzar"}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setConfirming(true)} disabled={blockers.length > 0}>
              Avanzar a «{PHASE_LABELS[next]}»
            </Button>
          )}
          <FormMessage state={state} />
        </div>
      )}
    </div>
  );
}
