"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { initialFormState } from "@/lib/forms";
import { updateEventAction } from "../actions";

export interface EventSettingsValues {
  name: string;
  capacity: number;
  minNominations: number;
  maxNominations: number;
  finalistsPerCategory: number;
  maxPrizeCategories: number;
  showWinnerPercent: boolean;
  allowNominationSkip: boolean;
  allowVoteAbstention: boolean;
}

/** true = se puede editar en la fase actual (ver lib/event/rules.ts). */
export interface EventSettingsEditable {
  structure: boolean;
  finalists: boolean;
  maxPrize: boolean;
  winnerPercent: boolean;
  voteRules: boolean;
}

type BooleanSetting = "showWinnerPercent" | "allowNominationSkip" | "allowVoteAbstention";

const LOCKED = "Bloqueado en esta fase para que las reglas sean iguales para todos.";

export function EventSettingsForm({
  values,
  editable,
}: {
  values: EventSettingsValues;
  editable: EventSettingsEditable;
}) {
  const [state, formAction, pending] = useActionState(updateEventAction, initialFormState);
  // Tras un error se muestra lo que se escribió; si no, lo guardado.
  const v = (key: keyof EventSettingsValues) => state.values?.[key] ?? String(values[key]);

  return (
    <form action={formAction} className="space-y-5">
      <TextField
        name="name"
        label="Nombre del evento"
        defaultValue={v("name")}
        required
        maxLength={80}
        errors={state.errors?.name}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="capacity"
          type="number"
          inputMode="numeric"
          label="Capacidad de la sala"
          hint="Máximo de personas que pueden registrarse."
          min={2}
          max={200}
          defaultValue={v("capacity")}
          required
          errors={state.errors?.capacity}
        />
        <TextField
          name="finalistsPerCategory"
          type="number"
          inputMode="numeric"
          label="Finalistas por categoría"
          hint={editable.finalists ? "Si hay empate en el último puesto, entran todos." : LOCKED}
          min={2}
          max={8}
          defaultValue={v("finalistsPerCategory")}
          disabled={!editable.finalists}
          required
          errors={state.errors?.finalistsPerCategory}
        />
        <TextField
          name="minNominations"
          type="number"
          inputMode="numeric"
          label="Mínimo de nominados por categoría"
          hint={editable.structure ? undefined : LOCKED}
          min={1}
          max={10}
          defaultValue={v("minNominations")}
          disabled={!editable.structure}
          required
          errors={state.errors?.minNominations}
        />
        <TextField
          name="maxNominations"
          type="number"
          inputMode="numeric"
          label="Máximo de nominados por categoría"
          hint={editable.structure ? undefined : LOCKED}
          min={1}
          max={10}
          defaultValue={v("maxNominations")}
          disabled={!editable.structure}
          required
          errors={state.errors?.maxNominations}
        />
        <TextField
          name="maxPrizeCategories"
          type="number"
          inputMode="numeric"
          label="Máximo de categorías de premio en la votación"
          hint={editable.maxPrize ? "Las honoríficas no cuentan para este tope." : LOCKED}
          min={1}
          max={50}
          defaultValue={v("maxPrizeCategories")}
          disabled={!editable.maxPrize}
          required
          errors={state.errors?.maxPrizeCategories}
        />
      </div>
      <fieldset className="space-y-4">
        <legend className="sr-only">Reglas de las papeletas</legend>
        {(
          [
            {
              name: "allowNominationSkip",
              editable: editable.structure,
              label: "Al nominar, se puede dejar una categoría vacía",
              hint: "Si no, hay que nominar al menos el mínimo en todas las categorías.",
            },
            {
              name: "allowVoteAbstention",
              editable: editable.voteRules,
              label: "Al votar, se puede abstener en una categoría",
              hint: "Aparece la opción «Me abstengo» junto a los finalistas.",
            },
            {
              name: "showWinnerPercent",
              editable: editable.winnerPercent,
              label: "Mostrar en la ceremonia el porcentaje del ganador (redondeado)",
              hint: "Nunca se muestran conteos exactos ni finalistas con cero votos.",
            },
          ] satisfies Array<{ name: BooleanSetting; editable: boolean; label: string; hint: string }>
        ).map((setting) => (
          <label key={setting.name} className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name={setting.name}
              defaultChecked={
                state.values ? state.values[setting.name] === "on" : values[setting.name]
              }
              disabled={!setting.editable}
              className="mt-0.5 size-5 shrink-0 accent-gold"
            />
            <span>
              {setting.label}
              <span className="block text-xs text-muted">
                {setting.editable ? setting.hint : LOCKED}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
