"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextAreaField, TextField } from "@/components/ui/Field";
import type { CategoryFraming, CategoryType, NomineeKind } from "@/generated/prisma/enums";
import { FRAMING_LABEL, NOMINEE_KIND_LABEL } from "@/lib/event/categoryKinds";
import { type FormState, initialFormState } from "@/lib/forms";
import { createCategoryAction, updateCategoryAction } from "../actions";

export interface CategoryFormValues {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
  framing: CategoryFraming;
  nomineeKind: NomineeKind;
  maxPicks: number;
  minPicks: number;
  finalistCount: number;
  allowExternal: boolean;
}

const TYPES: Array<{ value: CategoryType; label: string; hint: string }> = [
  { value: "PRIZE", label: "Premio", hint: "Compite por uno de los cupos de la votación." },
  { value: "HONORARY", label: "Honorífica", hint: "Reconocimiento especial; no cuenta para el tope." },
];

const FRAMINGS: Array<{ value: CategoryFraming; hint: string }> = [
  { value: "NORMAL", hint: "«El alma de la fiesta»" },
  { value: "PRONE", hint: "Escribe solo el final: «volverse gay»" },
  { value: "QUESTION", hint: "«¿Con quién dejarías a tu hijo/a?»" },
];

const KINDS: Array<{ value: NomineeKind; hint: string }> = [
  { value: "PERSON", hint: "Alguien de la lista de invitados." },
  { value: "PAIR", hint: "Dos invitados juntos (shipeo, dúo)." },
  { value: "OPTION", hint: "Eligen entre opciones que cargas tú." },
  { value: "TEXT", hint: "Escriben lo que quieran (frases, profes); al cierre juntas los que son lo mismo y pasan los más escritos." },
  { value: "DIRECT", hint: "No se nomina: pones tú los finalistas (eventos) y solo se vota." },
];

const radioCard =
  "border border-line bg-sheet flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3 has-checked:border-ink has-checked:bg-raised has-checked:shadow-[inset_3px_0_0_var(--copper)]";

/** Sin `category` crea una nueva; con `category` la edita. */
export function CategoryForm({
  category,
  canEditType = true,
  canEditFinalists = true,
  onDone,
}: {
  category?: CategoryFormValues;
  /** Tipo, qué se nomina y cuántos pone cada uno (solo en preparación). */
  canEditType?: boolean;
  /** Cuántos finalistas pasan (hasta el cierre de nominaciones). */
  canEditFinalists?: boolean;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = category
        ? await updateCategoryAction(prev, formData)
        : await createCategoryAction(prev, formData);
      if (result.ok) onDone?.();
      return result;
    },
    initialFormState,
  );
  const prefix = category ? `categoria-${category.id}` : "categoria-nueva";
  const type = state.values?.type ?? category?.type ?? "PRIZE";
  const framing = state.values?.framing ?? category?.framing ?? "NORMAL";
  const [kind, setKind] = useState<NomineeKind>((state.values?.nomineeKind as NomineeKind) ?? category?.nomineeKind ?? "PERSON");

  return (
    <form action={formAction} className="space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Cómo se lee el título</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FRAMINGS.map((option) => (
            <label key={option.value} className={radioCard}>
              <input type="radio" name="framing" value={option.value} defaultChecked={framing === option.value} className="mt-1 size-4 shrink-0 accent-copper" />
              <span className="text-sm">
                <span className="block font-medium">{FRAMING_LABEL[option.value]}</span>
                <span className="block text-xs text-ink-soft">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        id={`${prefix}-nombre`}
        name="name"
        label="Nombre"
        hint="En «Más propenso/a a…», solo el final de la frase."
        placeholder="El alma de la fiesta"
        defaultValue={state.values?.name ?? category?.name}
        required
        maxLength={60}
        errors={state.errors?.name}
      />
      <TextAreaField
        id={`${prefix}-consigna`}
        name="description"
        label="Criterio"
        hint="Qué cuenta para elegir en esta categoría (y qué no). Lo ve el grupo al nominar, en Nominados y al votar."
        placeholder="Quién convierte cualquier junta en fiesta. No es quien más toma: es quien más anima."
        defaultValue={state.values?.description ?? category?.description}
        required
        maxLength={400}
        rows={3}
        errors={state.errors?.description}
      />

      <fieldset disabled={!canEditType} className="space-y-2 disabled:opacity-60">
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((option) => (
            <label key={option.value} className={radioCard}>
              <input type="radio" name="type" value={option.value} defaultChecked={type === option.value} className="mt-1 size-4 shrink-0 accent-copper" />
              <span className="text-sm">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-ink-soft">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {state.errors?.type && <p className="text-sm text-danger">{state.errors.type.join(" ")}</p>}
      </fieldset>

      <fieldset disabled={!canEditType} className="space-y-2 disabled:opacity-60">
        <legend className="mb-2 text-sm font-medium">Qué se nomina</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KINDS.map((option) => (
            <label key={option.value} className={radioCard}>
              <input
                type="radio"
                name="nomineeKind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="mt-1 size-4 shrink-0 accent-copper"
              />
              <span className="text-sm">
                <span className="block font-medium">{NOMINEE_KIND_LABEL[option.value]}</span>
                <span className="block text-xs text-ink-soft">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset disabled={!canEditType} className="disabled:opacity-60">
          <label htmlFor={`${prefix}-cupos`} className="mb-1.5 block text-sm font-medium">
            Cuántos pone cada persona al nominar
          </label>
          <select
            id={`${prefix}-cupos`}
            name="maxPicks"
            defaultValue={String(state.values?.maxPicks ?? category?.maxPicks ?? 1)}
            className="min-h-12 w-full border border-line bg-sheet px-3 text-sm text-ink"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n} className="bg-bg">
                {n === 1 ? "1 (lo normal)" : `Hasta ${n}`}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset disabled={!canEditFinalists} className="disabled:opacity-60">
          <label htmlFor={`${prefix}-finalistas`} className="mb-1.5 block text-sm font-medium">
            Finalistas que pasan a la votación
          </label>
          <select
            id={`${prefix}-finalistas`}
            name="finalistCount"
            defaultValue={String(state.values?.finalistCount ?? category?.finalistCount ?? 4)}
            className="min-h-12 w-full border border-line bg-sheet px-3 text-sm text-ink"
          >
            {[3, 4, 5].map((n) => (
              <option key={n} value={n} className="bg-bg">
                {n} finalistas
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-soft">Siempre gana uno. Si hay empate en el corte, entran todos los empatados.</p>
        </fieldset>
      </div>

      {kind !== "DIRECT" && (
        <fieldset disabled={!canEditType} className="disabled:opacity-60">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="required"
              defaultChecked={(category?.minPicks ?? 0) > 0}
              className="size-4 shrink-0 accent-copper"
            />
            Obligatoria: hay que poner al menos uno para poder enviar
          </label>
        </fieldset>
      )}
      {kind === "PERSON" && (
        <fieldset disabled={!canEditType} className="disabled:opacity-60">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="allowExternal"
              defaultChecked={category?.allowExternal ?? false}
              className="size-4 shrink-0 accent-copper"
            />
            Permitir nominar a alguien de fuera del grupo («Otro»)
          </label>
        </fieldset>
      )}
      {!canEditType && (
        <p className="text-xs text-ink-soft">Tipo, qué se nomina y cuántos pone cada uno solo se cambian durante la preparación.</p>
      )}

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : category ? "Guardar" : "Agregar categoría"}
        </Button>
        {category && (
          <Button variant="secondary" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
