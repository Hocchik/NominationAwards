import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/forms";

// Campos de formulario con etiqueta, ayuda y errores conectados para lectores
// de pantalla (aria-describedby / aria-invalid).

// Sin chaflán: el borde fino quedaría cortado en la diagonal (CLAUDE.md §9).
const control =
  "w-full border border-line-strong bg-raised px-4 text-base text-ink placeholder:text-ink-soft " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:border-2";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: (describedBy: string | undefined, invalid: boolean) => React.ReactNode;
}

function FieldShell({ id, label, hint, errors, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children(describedBy, Boolean(errorId))}
      {hint && (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
}

export function TextField({ label, hint, errors, id, className, ...props }: TextFieldProps) {
  const fieldId = id ?? `field-${props.name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} errors={errors}>
      {(describedBy, invalid) => (
        <input
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "min-h-12", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
}

export function TextAreaField({ label, hint, errors, id, className, ...props }: TextAreaFieldProps) {
  const fieldId = id ?? `field-${props.name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} errors={errors}>
      {(describedBy, invalid) => (
        <textarea
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "min-h-24 py-3", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

/** Mensaje general de un formulario: verde si salió bien, rojo si no. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn("text-sm font-semibold", state.ok ? "text-success" : "text-danger")}
    >
      {state.message}
    </p>
  );
}
