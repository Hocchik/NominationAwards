"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { type FormState, initialFormState } from "@/lib/forms";
import { updateScheduleAction } from "../actions";

// Las fechas se escriben en la hora del dispositivo del admin y se guardan en
// UTC. La conversión se hace aquí, en el navegador, porque el servidor (Vercel)
// no sabe en qué zona horaria está el grupo.

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: FormDataEntryValue | null): string {
  if (typeof local !== "string" || !local) return "";
  const date = new Date(local); // "2026-11-22T18:00" se interpreta en hora local
  return Number.isNaN(date.getTime()) ? "invalid" : date.toISOString();
}

const noop = () => () => {};

export function ScheduleForm({
  nominationsCloseAt,
  opensAt,
  closesAt,
  editable,
  nominationsCloseEditable,
}: {
  nominationsCloseAt: string | null;
  opensAt: string | null;
  closesAt: string | null;
  editable: boolean;
  /** Solo hasta que cierran las nominaciones. */
  nominationsCloseEditable: boolean;
}) {
  // En el servidor no se conoce la zona horaria del admin: los campos se
  // llenan recién en el navegador (y se vuelven a montar con `key`).
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const timeZone = isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      formData.set("nominationsCloseAt", toIso(formData.get("nominationsLocal")));
      formData.set("votingOpensAt", toIso(formData.get("opensLocal")));
      formData.set("votingClosesAt", toIso(formData.get("closesLocal")));
      return updateScheduleAction(prev, formData);
    },
    initialFormState,
  );

  return (
    <form action={formAction} className="space-y-5" key={isClient ? "client" : "server"}>
      <TextField
        name="nominationsLocal"
        type="datetime-local"
        label="Cierran las nominaciones"
        defaultValue={state.values?.nominationsLocal ?? (isClient ? toLocalInput(nominationsCloseAt) : "")}
        disabled={!editable || !nominationsCloseEditable}
        errors={state.errors?.nominationsCloseAt}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="opensLocal"
          type="datetime-local"
          label="Abre la votación"
          defaultValue={state.values?.opensLocal ?? (isClient ? toLocalInput(opensAt) : "")}
          disabled={!editable}
          errors={state.errors?.votingOpensAt}
        />
        <TextField
          name="closesLocal"
          type="datetime-local"
          label="Cierra la votación"
          defaultValue={state.values?.closesLocal ?? (isClient ? toLocalInput(closesAt) : "")}
          disabled={!editable}
          errors={state.errors?.votingClosesAt}
        />
      </div>
      <p className="text-xs text-ink-soft">
        {editable
          ? `Hora de tu dispositivo${timeZone ? ` (${timeZone})` : ""}. A esas horas las nominaciones cierran solas (después el notario las abre) y la votación abre y cierra sola si hay categorías activas; lo normal es abrirla un día antes de la reunión. También puedes adelantar cualquier paso con el botón de fases. La página de Nominados muestra la cuenta regresiva.`
          : "La votación ya cerró: el horario no se puede cambiar."}
      </p>
      <FormMessage state={state} />
      {editable && (
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar horario"}
        </Button>
      )}
    </form>
  );
}
