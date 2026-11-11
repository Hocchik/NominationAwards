"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextAreaField, TextField } from "@/components/ui/Field";
import type { CategoryType } from "@/generated/prisma/enums";
import { type FormState, initialFormState } from "@/lib/forms";
import { createCategoryAction, updateCategoryAction } from "../actions";

export interface CategoryFormValues {
  id: string;
  name: string;
  description: string;
  type: CategoryType;
}

const TYPES: Array<{ value: CategoryType; label: string; hint: string }> = [
  { value: "PRIZE", label: "Premio", hint: "Compite por uno de los cupos de la votación." },
  { value: "HONORARY", label: "Honorífica", hint: "Reconocimiento especial; no cuenta para el tope." },
];

/** Sin `category` crea una nueva; con `category` la edita. */
export function CategoryForm({
  category,
  canEditType = true,
  onDone,
}: {
  category?: CategoryFormValues;
  canEditType?: boolean;
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

  return (
    <form action={formAction} className="space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}
      <TextField
        id={`${prefix}-nombre`}
        name="name"
        label="Nombre"
        placeholder="El alma de la fiesta"
        defaultValue={state.values?.name ?? category?.name}
        required
        maxLength={60}
        errors={state.errors?.name}
      />
      <TextAreaField
        id={`${prefix}-consigna`}
        name="description"
        label="Consigna"
        hint="La pregunta que verá el grupo al nominar."
        placeholder="¿Quién convierte cualquier reunión en un evento?"
        defaultValue={state.values?.description ?? category?.description}
        required
        maxLength={240}
        rows={2}
        errors={state.errors?.description}
      />
      <fieldset disabled={!canEditType} className="space-y-2 disabled:opacity-60">
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((option) => (
            <label
              key={option.value}
              className="glass flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-4 py-3 has-checked:border-gold/60"
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                defaultChecked={type === option.value}
                className="mt-1 size-4 shrink-0 accent-gold"
              />
              <span className="text-sm">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {!canEditType && (
          <p className="text-xs text-muted">El tipo solo se cambia durante la preparación.</p>
        )}
        {state.errors?.type && <p className="text-sm text-danger">{state.errors.type.join(" ")}</p>}
      </fieldset>
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
