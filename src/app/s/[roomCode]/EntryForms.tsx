"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { type RoomFormState, loginAction, registerAction, setNewPinAction } from "./actions";

const initial: RoomFormState = { ok: false };

const PIN_PROPS = {
  type: "password",
  inputMode: "numeric",
  pattern: "\\d{4,6}",
  minLength: 4,
  maxLength: 6,
  required: true,
} as const;

export function EntryForms({
  roomCode,
  names,
  registration,
}: {
  roomCode: string;
  names: string[];
  /** null = registro abierto; si no, el motivo por el que está cerrado. */
  registration: string | null;
}) {
  const [tab, setTab] = useState<"register" | "login">(registration ? "login" : "register");

  return (
    <div className="space-y-5">
      <div role="group" aria-label="¿Cómo quieres entrar?" className="grid grid-cols-2 gap-2">
        <TabButton active={tab === "register"} onClick={() => setTab("register")}>
          Registrarme
        </TabButton>
        <TabButton active={tab === "login"} onClick={() => setTab("login")}>
          Ya me registré
        </TabButton>
      </div>
      {tab === "register" ? (
        registration ? (
          <p className="text-sm text-muted">{registration}</p>
        ) : (
          <RegisterForm roomCode={roomCode} />
        )
      ) : (
        <LoginForm roomCode={roomCode} names={names} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-12 rounded-xl border px-4 text-sm font-semibold transition-colors",
        active ? "border-gold/60 bg-gold/10 text-foreground" : "border-line text-muted",
      )}
    >
      {children}
    </button>
  );
}

function RegisterForm({ roomCode }: { roomCode: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roomCode" value={roomCode} />
      <TextField
        id="registro-nombre"
        name="name"
        label="Tu nombre"
        hint="Como te conoce el grupo. El organizador aprueba cada registro."
        defaultValue={state.values?.name}
        autoComplete="name"
        required
        maxLength={40}
        errors={state.errors?.name}
      />
      <TextField
        id="registro-pin"
        name="pin"
        label="Crea un PIN"
        hint="De 4 a 6 números. Lo vas a usar para entrar desde otro dispositivo."
        autoComplete="new-password"
        errors={state.errors?.pin}
        {...PIN_PROPS}
      />
      <TextField
        id="registro-pin-2"
        name="pinConfirm"
        label="Repite el PIN"
        autoComplete="new-password"
        errors={state.errors?.pinConfirm}
        {...PIN_PROPS}
      />
      <FormMessage state={state} />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Registrando…" : "Registrarme"}
      </Button>
    </form>
  );
}

function LoginForm({ roomCode, names }: { roomCode: string; names: string[] }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [newPinState, newPinAction, newPinPending] = useActionState(setNewPinAction, initial);

  if (names.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay nadie registrado en esta sala.</p>;
  }

  // El admin restableció el PIN de este nombre: se crea uno nuevo.
  if (state.needsNewPin || newPinState.needsNewPin) {
    const name = newPinState.values?.name ?? state.values?.name ?? "";
    return (
      <form action={newPinAction} className="space-y-4">
        <input type="hidden" name="roomCode" value={roomCode} />
        <input type="hidden" name="name" value={name} />
        <p className="text-sm">
          El organizador restableció el PIN de <strong>{name}</strong>. Crea uno nuevo para entrar.
        </p>
        <TextField
          id="nuevo-pin"
          name="pin"
          label="Nuevo PIN"
          autoComplete="new-password"
          errors={newPinState.errors?.pin}
          {...PIN_PROPS}
        />
        <TextField
          id="nuevo-pin-2"
          name="pinConfirm"
          label="Repite el PIN"
          autoComplete="new-password"
          errors={newPinState.errors?.pinConfirm}
          {...PIN_PROPS}
        />
        <FormMessage state={newPinState} />
        <Button type="submit" fullWidth disabled={newPinPending}>
          {newPinPending ? "Guardando…" : "Guardar PIN y entrar"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roomCode" value={roomCode} />
      <div className="space-y-1.5">
        <label htmlFor="ingreso-nombre" className="block text-sm font-medium">
          Tu nombre
        </label>
        <select
          id="ingreso-nombre"
          name="name"
          required
          defaultValue={state.values?.name ?? ""}
          className="glass min-h-12 w-full rounded-xl px-4 text-base text-foreground"
        >
          <option value="" disabled>
            Elige tu nombre…
          </option>
          {names.map((n) => (
            <option key={n} value={n} className="bg-background">
              {n}
            </option>
          ))}
        </select>
      </div>
      <TextField
        id="ingreso-pin"
        name="pin"
        label="Tu PIN"
        autoComplete="current-password"
        {...PIN_PROPS}
      />
      <FormMessage state={newPinState.message ? newPinState : state} />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
